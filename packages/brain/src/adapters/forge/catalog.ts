import type { BrainEdge, BrainGraph, BrainNode } from '../../core/types'
import { forgeNodeId, parseForgeRef } from '../../core/identity'
import type { ForgeAdapterContext, ForgePackList, ForgeSkillList, HostPackProjection, HostRelationship, HostSkillProjection } from './wire-types'
export interface ForgeCatalogInput {
  readonly context: ForgeAdapterContext
  readonly packs?: ForgePackList
  readonly skills?: ForgeSkillList
  readonly manifests?: readonly HostPackProjection[]
  readonly skillMetadata?: readonly HostSkillProjection[]
  readonly relationships?: readonly HostRelationship[]
  readonly completeness?: 'complete' | 'partial'
}
export function pageReference(ref: string, pageSlug: string): string { return `${ref.split('#')[0]}#${pageSlug}` }
export function normalizeForgeCatalog(input: ForgeCatalogInput): BrainGraph {
  const { context } = input
  const nodes = new Map<string, BrainNode>(), edges: BrainEdge[] = []
  const add = (ref: string, kind: string, label: string, version: string, metadata: NonNullable<BrainNode['metadata']>, metrics?: BrainNode['metrics'], contentHash?: string) => {
    const parsed = parseForgeRef(ref, context.callerTenant), id = forgeNodeId(ref, context)
    if (!parsed || !id) return
    nodes.set(id, { ...nodes.get(id), id, kind, label, version, canonicalRef: ref, resourceKey: parsed.resourceKey, sourceNamespace: context.sourceNamespace, metadata, metrics, contentHash })
  }
  for (const pack of input.packs?.packs ?? []) {
    const parsed = parseForgeRef(pack.pack_ref, context.callerTenant)
    if (!parsed) continue
    add(pack.pack_ref, 'pack', parsed.name.replaceAll('-', ' '), pack.current_version, { containsPhi: pack.contains_phi, provenance: pack.provenance, updatedAt: pack.updated_at, subjectKind: parsed.subjectKind, subjectId: parsed.subjectId, owner: parsed.owner, completeness: 'summary', evidence: 'PackSummary; pages and body references not loaded', synthetic: context.simulated ?? false }, { pageCount: pack.page_count, loadedPageCount: 0 })
  }
  for (const skill of input.skills?.skills ?? []) {
    const parsed = parseForgeRef(skill.skill_ref, context.callerTenant)
    if (!parsed) continue
    add(skill.skill_ref, 'skill', parsed.name.replaceAll('-', ' '), skill.current_version, { scope: skill.scope, owner: parsed.owner, updatedAt: skill.updated_at, completeness: 'summary', evidence: 'SkillSummary; activation declarations unknown', synthetic: context.simulated ?? false })
  }
  for (const manifest of input.manifests ?? []) {
    const id = forgeNodeId(manifest.packRef, context), summary = id ? nodes.get(id) : undefined
    const prior = summary?.metadata && typeof summary.metadata === 'object' && !Array.isArray(summary.metadata) ? summary.metadata : {}
    const metadata = { ...prior, subjectKind: manifest.subject.kind, subjectId: manifest.subject.id, subjectLabel: manifest.subject.label, realm: 'default', sharedReadOnly: manifest.sharedReadOnly ?? false, completeness: 'manifest', evidence: manifest.evidenceLocator ?? 'Authorized host manifest projection', synthetic: context.simulated ?? false }
    add(manifest.packRef, 'pack', manifest.label, manifest.version, metadata, { pageCount: summary?.metrics?.pageCount ?? null, loadedPageCount: manifest.pages.length, targetTokens: manifest.targetTokens ?? null })
    for (const page of manifest.pages) {
      const ref = pageReference(manifest.packRef, page.entry.slug), pageId = forgeNodeId(ref, context)
      add(ref, 'page', page.entry.title, manifest.version, { subjectKind: manifest.subject.kind, subjectId: manifest.subject.id, subjectLabel: manifest.subject.label, realm: 'default', containsPhi: page.entry.contains_phi, provenance: page.entry.provenance, contentType: page.entry.content_type, completeness: 'metadata', evidence: manifest.evidenceLocator ?? 'Authorized PackPageEntry projection', synthetic: context.simulated ?? false }, { contentBytes: page.entry.size_bytes, targetTokens: page.targetTokens ?? null }, page.entry.blake3)
      if (id && pageId) edges.push({ id: `${id}:contains:${pageId}`, source: id, target: pageId, kind: 'contains', directed: true, evidence: { origin: 'manifest', locator: manifest.evidenceLocator }, metadata: { explanation: 'This page is explicitly listed in the supplied authorized manifest.' } })
    }
  }
  const relationships = [...(input.relationships ?? [])]
  for (const skill of input.skillMetadata ?? []) {
    const parsed = parseForgeRef(skill.skillRef, context.callerTenant)
    add(skill.skillRef, 'skill', skill.label, skill.version, { scope: skill.scope, owner: parsed?.owner ?? 'unknown', description: skill.description ?? '', completeness: 'metadata', evidence: 'Authorized host Skill metadata; activation is a declaration, not execution', synthetic: context.simulated ?? false }, { targetTokens: skill.targetTokens ?? null })
    for (const ref of skill.activationPackRefs ?? []) relationships.push({ sourceRef: skill.skillRef, targetRef: ref, kind: 'declares', directed: true, origin: 'host-supplied', explanation: 'The supplied Skill activation declaration names this Pack. This does not establish transitive resolution or execution.' })
  }
  for (const [index, relationship] of relationships.entries()) {
    const source = forgeNodeId(relationship.sourceRef, context), target = forgeNodeId(relationship.targetRef, context)
    if (!source || !target || !nodes.has(source) || !nodes.has(target)) continue
    edges.push({ id: `explicit:${source}:${target}:${index}`, source, target, kind: relationship.kind, directed: relationship.directed, evidence: { origin: relationship.origin, locator: relationship.locator }, metadata: { explanation: relationship.explanation } })
  }
  return { schemaVersion: '1', scopeKey: context.scopeKey, revision: context.graphRevision, nodes: [...nodes.values()], edges, completeness: input.completeness ?? 'partial', nextCursor: input.packs?.next_cursor ?? input.skills?.next_cursor ?? undefined }
}
