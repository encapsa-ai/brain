// src/core/identity.ts
function namespacedId(scopeKey, sourceNamespace, resourceKey) {
  return [scopeKey, sourceNamespace, resourceKey].map(encodeURIComponent).join("::");
}
function parseForgeRef(reference, callerTenant) {
  const match = /^(pack|skill):\/\/([^\s?#]+)(?:#([^\s#?]+))?$/.exec(reference);
  if (!match || !callerTenant) return null;
  const kind = match[1];
  const versionParts = match[2].split("@");
  if (versionParts.length > 2 || versionParts.length === 2 && !versionParts[1]) return null;
  const parts = versionParts[0].split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || /[%\\]/.test(part))) return null;
  const version = versionParts[1] ?? null;
  const pageSlug = match[3] ?? null;
  let owner, subjectKind, subjectId, name;
  if (kind === "pack" && (parts.length === 3 || parts.length === 4)) {
    owner = parts.length === 4 ? parts[0] : callerTenant;
    [subjectKind, subjectId, name] = parts.slice(-3);
  } else if (kind === "skill" && parts[0] === "forge" && parts.length === 2 && !pageSlug) {
    owner = "forge";
    subjectKind = "skill-library";
    subjectId = "forge";
    name = parts[1];
  } else if (kind === "skill" && parts[0] === "tenant" && parts.length === 3 && !pageSlug) {
    owner = parts[1];
    subjectKind = "skill-library";
    subjectId = parts[1];
    name = parts[2];
  } else return null;
  const resourceKey = [kind, owner, subjectKind, subjectId, name, ...pageSlug ? ["page", pageSlug] : []].map(encodeURIComponent).join("/");
  return { kind, owner, subjectKind, subjectId, name, version, pageSlug, resourceKey };
}
function forgeNodeId(reference, context) {
  const parsed = parseForgeRef(reference, context.callerTenant);
  return parsed ? namespacedId(context.scopeKey, context.sourceNamespace, parsed.resourceKey) : null;
}

// src/adapters/forge/catalog.ts
function pageReference(ref, pageSlug) {
  return `${ref.split("#")[0]}#${pageSlug}`;
}
function normalizeForgeCatalog(input) {
  const { context } = input;
  const nodes = /* @__PURE__ */ new Map(), edges = [];
  const add = (ref, kind, label, version, metadata, metrics, contentHash) => {
    const parsed = parseForgeRef(ref, context.callerTenant), id = forgeNodeId(ref, context);
    if (!parsed || !id) return;
    nodes.set(id, { ...nodes.get(id), id, kind, label, version, canonicalRef: ref, resourceKey: parsed.resourceKey, sourceNamespace: context.sourceNamespace, metadata, metrics, contentHash });
  };
  for (const pack of input.packs?.packs ?? []) {
    const parsed = parseForgeRef(pack.pack_ref, context.callerTenant);
    if (!parsed) continue;
    add(pack.pack_ref, "pack", parsed.name.replaceAll("-", " "), pack.current_version, { containsPhi: pack.contains_phi, provenance: pack.provenance, updatedAt: pack.updated_at, subjectKind: parsed.subjectKind, subjectId: parsed.subjectId, owner: parsed.owner, completeness: "summary", evidence: "PackSummary; pages and body references not loaded", synthetic: context.simulated ?? false }, { pageCount: pack.page_count, loadedPageCount: 0 });
  }
  for (const skill of input.skills?.skills ?? []) {
    const parsed = parseForgeRef(skill.skill_ref, context.callerTenant);
    if (!parsed) continue;
    add(skill.skill_ref, "skill", parsed.name.replaceAll("-", " "), skill.current_version, { scope: skill.scope, owner: parsed.owner, updatedAt: skill.updated_at, completeness: "summary", evidence: "SkillSummary; activation declarations unknown", synthetic: context.simulated ?? false });
  }
  for (const manifest of input.manifests ?? []) {
    const id = forgeNodeId(manifest.packRef, context), summary = id ? nodes.get(id) : void 0;
    const prior = summary?.metadata && typeof summary.metadata === "object" && !Array.isArray(summary.metadata) ? summary.metadata : {};
    const metadata = { ...prior, subjectKind: manifest.subject.kind, subjectId: manifest.subject.id, subjectLabel: manifest.subject.label, realm: "default", sharedReadOnly: manifest.sharedReadOnly ?? false, completeness: "manifest", evidence: manifest.evidenceLocator ?? "Authorized host manifest projection", synthetic: context.simulated ?? false };
    add(manifest.packRef, "pack", manifest.label, manifest.version, metadata, { pageCount: summary?.metrics?.pageCount ?? null, loadedPageCount: manifest.pages.length, targetTokens: manifest.targetTokens ?? null });
    for (const page of manifest.pages) {
      const ref = pageReference(manifest.packRef, page.entry.slug), pageId = forgeNodeId(ref, context);
      add(ref, "page", page.entry.title, manifest.version, { subjectKind: manifest.subject.kind, subjectId: manifest.subject.id, subjectLabel: manifest.subject.label, realm: "default", containsPhi: page.entry.contains_phi, provenance: page.entry.provenance, contentType: page.entry.content_type, completeness: "metadata", evidence: manifest.evidenceLocator ?? "Authorized PackPageEntry projection", synthetic: context.simulated ?? false }, { contentBytes: page.entry.size_bytes, targetTokens: page.targetTokens ?? null }, page.entry.blake3);
      if (id && pageId) edges.push({ id: `${id}:contains:${pageId}`, source: id, target: pageId, kind: "contains", directed: true, evidence: { origin: "manifest", locator: manifest.evidenceLocator }, metadata: { explanation: "This page is explicitly listed in the supplied authorized manifest." } });
    }
  }
  const relationships = [...input.relationships ?? []];
  for (const skill of input.skillMetadata ?? []) {
    const parsed = parseForgeRef(skill.skillRef, context.callerTenant);
    add(skill.skillRef, "skill", skill.label, skill.version, { scope: skill.scope, owner: parsed?.owner ?? "unknown", description: skill.description ?? "", completeness: "metadata", evidence: "Authorized host Skill metadata; activation is a declaration, not execution", synthetic: context.simulated ?? false }, { targetTokens: skill.targetTokens ?? null });
    for (const ref of skill.activationPackRefs ?? []) relationships.push({ sourceRef: skill.skillRef, targetRef: ref, kind: "declares", directed: true, origin: "host-supplied", explanation: "The supplied Skill activation declaration names this Pack. This does not establish transitive resolution or execution." });
  }
  for (const [index, relationship] of relationships.entries()) {
    const source = forgeNodeId(relationship.sourceRef, context), target = forgeNodeId(relationship.targetRef, context);
    if (!source || !target || !nodes.has(source) || !nodes.has(target)) continue;
    edges.push({ id: `explicit:${source}:${target}:${index}`, source, target, kind: relationship.kind, directed: relationship.directed, evidence: { origin: relationship.origin, locator: relationship.locator }, metadata: { explanation: relationship.explanation } });
  }
  return { schemaVersion: "1", scopeKey: context.scopeKey, revision: context.graphRevision, nodes: [...nodes.values()], edges, completeness: input.completeness ?? "partial", nextCursor: input.packs?.next_cursor ?? input.skills?.next_cursor ?? void 0 };
}

// src/adapters/forge/receipt-common.ts
function receiptFields(receipt) {
  return { traceId: receipt.trace_id, targetModelAlias: receipt.target_model_alias, compiledTokenCount: receipt.compiled_token_count, tokenBudgetCheckDeferred: receipt.token_budget_check_deferred, compilationHash: receipt.compilation_hash, compiledAt: receipt.compiled_at, ...receipt.context_params_digest ? { contextParamsDigest: receipt.context_params_digest } : {} };
}
function observationBase(receipt, context, origin) {
  return { id: receipt.trace_id, association: { scopeKey: context.scopeKey, graphRevision: context.graphRevision, sourceNamespace: context.sourceNamespace, callerTenant: context.callerTenant }, origin, simulated: context.simulated ?? false, requestedRefs: context.requestedRefs ?? [], status: "success", receipt: receiptFields(receipt) };
}
function droppedSections(dropped, context) {
  return dropped.map((section) => {
    const sourceRef = section.page_slug ? pageReference(section.source_ref, section.page_slug) : section.source_ref;
    const parsed = parseForgeRef(sourceRef, context.callerTenant);
    return { sourceRef, resourceKey: parsed?.resourceKey, version: section.version, pageSlug: section.page_slug ?? parsed?.pageSlug ?? null, outcome: "dropped", redactionApplied: null, compiledTokenCount: null, targetTokens: section.target_tokens, priority: section.priority };
  });
}

// src/adapters/forge/resolve-response.ts
function normalizeForgeResolveResponse(response, context) {
  const sections = [];
  for (const resolved of response.resolved_refs) {
    const refs = [resolved.ref, ...(resolved.resolved_pages ?? []).map((slug) => pageReference(resolved.ref, slug))];
    for (const sourceRef of [...new Set(refs)]) {
      const parsed = parseForgeRef(sourceRef, context.callerTenant);
      sections.push({ sourceRef, resourceKey: parsed?.resourceKey, version: parsed?.version ?? null, pageSlug: parsed?.pageSlug ?? null, outcome: "resolved", redactionApplied: null, compiledTokenCount: null, targetTokens: null });
    }
  }
  return { ...observationBase(response.receipt, context, "public-resolve"), sections: [...sections, ...droppedSections(response.receipt.sections_dropped, context)] };
}

// src/adapters/forge/generation-receipt.ts
function normalizeForgeGenerationReceipt(contextReceipt, context) {
  return { ...observationBase(contextReceipt, context, "public-generation"), sections: droppedSections(contextReceipt.sections_dropped, context) };
}

// src/adapters/forge/internal-receipt.ts
function normalizeForgeInternalReceipt(receipt, context) {
  if (receipt.tenant_id !== context.callerTenant) return { id: receipt.trace_id, association: context, origin: "host-internal", simulated: context.simulated ?? false, requestedRefs: context.requestedRefs ?? [], status: "failure", failure: "unavailable", sections: [] };
  const kept = receipt.resolved_refs.map((section) => {
    const sourceRef = section.page_slug ? pageReference(section.source_ref, section.page_slug) : section.source_ref;
    const parsed = parseForgeRef(sourceRef, context.callerTenant);
    return { sourceRef, resourceKey: parsed?.resourceKey, version: section.version, pageSlug: section.page_slug ?? parsed?.pageSlug ?? null, outcome: "included", redactionApplied: section.redaction_applied, compiledTokenCount: section.compiled_token_count, targetTokens: section.target_tokens, bodyHash: section.body_hash, redactorEngine: section.redactor_engine };
  });
  return { ...observationBase(receipt, context, "host-internal"), sections: [...kept, ...droppedSections(receipt.sections_dropped, context)] };
}

// src/core/hierarchy.ts
function metadataString(node, key) {
  if (!node.metadata || typeof node.metadata !== "object" || Array.isArray(node.metadata)) return void 0;
  const value = node.metadata[key];
  return typeof value === "string" ? value : void 0;
}
var defaultNodeKinds = {
  pack: { label: "Pack", color: "#62d9ca", shape: "hexagon", glyph: "P" },
  page: { label: "Page", color: "#84bdd6", shape: "circle", glyph: "\u2022" },
  skill: { label: "Skill", color: "#e8bd72", shape: "diamond", glyph: "S" },
  aggregate: { label: "Group", color: "#9aa7bc", shape: "square", glyph: "+" }
};

// src/adapters/forge/preset.ts
var forgePreset = {
  id: "forge-default",
  nodeKinds: defaultNodeKinds,
  hierarchy(graph) {
    const groups = /* @__PURE__ */ new Map([
      ["workspace", { id: "workspace", tierId: "workspace", label: "Authorized workspace" }],
      ["tenant", { id: "tenant", parentGroupId: "workspace", tierId: "tenant", label: "Tenant scope" }],
      ["default", { id: "default", parentGroupId: "tenant", tierId: "realm", label: "Default realm" }],
      ["tenant-skills", { id: "tenant-skills", parentGroupId: "tenant", tierId: "library", label: "Tenant Skill library" }],
      ["forge-skills", { id: "forge-skills", parentGroupId: "workspace", tierId: "library", label: "Forge Skill library" }]
    ]);
    const memberships = [];
    for (const node of graph.nodes) {
      if (node.kind === "skill") {
        memberships.push({ nodeId: node.id, groupId: metadataString(node, "owner") === "forge" ? "forge-skills" : "tenant-skills" });
        continue;
      }
      const subject = metadataString(node, "subjectKind") ?? "other", subjectId = metadataString(node, "subjectId") ?? "loaded";
      const id = `subject:${subject}:${subjectId}`;
      const labels = { org: "Organization", user: "User context", website: "Website", contentmatrix_project: "Content projects", vertical_entity: "Industry knowledge", shareable_agent: "Shared agents" };
      groups.set(id, { id, parentGroupId: "default", tierId: "subject", label: labels[subject] ?? subject });
      if (node.kind === "page") {
        const containment = graph.edges.find((edge) => edge.kind === "contains" && edge.target === node.id);
        const pack = graph.nodes.find((candidate) => candidate.id === containment?.source);
        if (pack) {
          const packGroupId = `pack-group:${pack.id}`;
          groups.set(packGroupId, { id: packGroupId, parentGroupId: id, tierId: "pack", label: pack.label });
          memberships.push({ nodeId: node.id, groupId: packGroupId });
          continue;
        }
      }
      memberships.push({ nodeId: node.id, groupId: id });
    }
    return { groups: [...groups.values()], memberships };
  }
};
export {
  forgePreset,
  normalizeForgeCatalog,
  normalizeForgeGenerationReceipt,
  normalizeForgeInternalReceipt,
  normalizeForgeResolveResponse,
  pageReference
};
