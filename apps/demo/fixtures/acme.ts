import { normalizeForgeCatalog } from '../../../packages/brain/src/adapters/forge/catalog'
import type { ForgeCatalogInput } from '../../../packages/brain/src/adapters/forge/catalog'
import type { ForgeAdapterContext, HostPackProjection, HostSkillProjection } from '../../../packages/brain/src/adapters/forge/wire-types'
import { forgeNodeId } from '../../../packages/brain/src/core/identity'

export const fixtureContext: ForgeAdapterContext = { scopeKey: 'synthetic:tenant_demo:authorized', graphRevision: 'fixture-2026-10-02', sourceNamespace: 'forge-demo', callerTenant: 'tenant_demo', simulated: true }
export const brandRef = 'pack://org/org_acme/brand-voice'
const specifications = [
  ['org', 'org_acme', 'Acme Studio', 'brand-voice', 'Brand voice', 'v14', ['Voice & tone', 'Terminology', 'Messaging principles', 'Writing examples']],
  ['org', 'org_acme', 'Acme Studio', 'company-knowledge', 'Company knowledge', 'v8', ['Our story', 'Values & principles', 'Team structure', 'Product overview']],
  ['website', 'site_acme', 'Acme website', 'site-architecture', 'Site architecture', 'v3', ['Navigation', 'Content model', 'Page templates', 'Accessibility']],
  ['website', 'site_acme', 'Acme website', 'product-messaging', 'Product messaging', 'v6', ['Value proposition', 'Feature language', 'Audience segments', 'Conversion copy']],
  ['contentmatrix_project', 'project_launch', 'Autumn launch', 'launch-playbook', 'Launch playbook', 'v4', ['Launch narrative', 'Channel strategy', 'Content calendar', 'Review checklist']],
  ['contentmatrix_project', 'project_launch', 'Autumn launch', 'editorial-standards', 'Editorial standards', 'v2', ['Style guide', 'Citations', 'Formatting', 'Publishing checklist']],
  ['user', 'user_demo', 'Fictional author', 'user-preferences', 'User preferences', 'v2', ['Writing preferences', 'Language settings', 'Content interests', 'Review preferences']],
  ['user', 'user_demo', 'Fictional author', 'writing-patterns', 'Writing patterns', 'v1', ['Sentence structure', 'Vocabulary', 'Document structure', 'Revision patterns']],
  ['vertical_entity', 'industry_design', 'Design industry', 'industry-research', 'Industry research', 'v5', ['Market overview', 'Design trends', 'Research methods', 'Industry glossary']],
  ['vertical_entity', 'industry_design', 'Design industry', 'compliance-context', 'Compliance context', 'v3', ['Data handling', 'Retention policy', 'PHI-marked metadata', 'Review requirements']],
  ['shareable_agent', 'agent_editor', 'Editorial assistant', 'agent-playbook', 'Agent playbook', 'v2', ['Agent purpose', 'Tool boundaries', 'Output format', 'Escalation rules']],
  ['shareable_agent', 'agent_editor', 'Editorial assistant', 'partner-knowledge', 'Partner knowledge', 'v7', ['Shared guidelines', 'Collaboration', 'Shared glossary', 'Review process']],
] as const
const slugFor = (label: string) => label.toLowerCase().replaceAll(' & ', '-').replaceAll(' ', '-')
export const manifests: readonly HostPackProjection[] = specifications.map(([kind, subjectId, subjectLabel, name, label, version, pages], index) => ({
  packRef: `${index === 11 ? 'pack://tenant_owner/' : 'pack://'}${kind}/${subjectId}/${name}`,
  label, version, subject: { kind, id: subjectId, label: subjectLabel }, targetTokens: 650 + index * 110,
  sharedReadOnly: index === 11,
  evidenceLocator: index === 11 ? 'synthetic authorized read-only grant projection' : 'synthetic authorized manifest projection',
  pages: pages.map((title, pageIndex) => ({ entry: { slug: index === 0 && pageIndex === 0 ? 'voice' : slugFor(title), title, blake3: `synthetic-content-hash-${index}-${pageIndex}`, size_bytes: 580 + index * 190 + pageIndex * 260, contains_phi: index === 9 && pageIndex === 2, provenance: index === 11 ? 'authorized-shared' : 'host-approved-synthetic', budget: null, activation_tags: [], content_type: 'text/markdown' }, targetTokens: 180 + index * 75 + pageIndex * 95 })),
}))
export const skillMetadata: readonly HostSkillProjection[] = [
  { skillRef: 'skill://forge/review-composer@v2', label: 'Review composer', version: 'v2', scope: 'forge', targetTokens: 1200, description: 'A declared procedure for reviewing written content against supplied factual context.', activationPackRefs: [brandRef, manifests[5].packRef, manifests[3].packRef] },
  { skillRef: 'skill://tenant/tenant_demo/content-writer@v3', label: 'Content writer', version: 'v3', scope: 'tenant', targetTokens: 1600, description: 'A synthetic writing procedure with explicitly declared context references.', activationPackRefs: [brandRef, manifests[3].packRef, manifests[6].packRef] },
  { skillRef: 'skill://forge/summarize@v1', label: 'Summarize context', version: 'v1', scope: 'forge', targetTokens: 700, activationPackRefs: [manifests[1].packRef, manifests[8].packRef] },
  { skillRef: 'skill://tenant/tenant_demo/launch-review@v2', label: 'Launch review', version: 'v2', scope: 'tenant', targetTokens: 1100, activationPackRefs: [manifests[4].packRef, manifests[9].packRef, manifests[10].packRef] },
  { skillRef: 'skill://forge/quality-check@v4', label: 'Quality check', version: 'v4', scope: 'forge', targetTokens: 900, activationPackRefs: [manifests[5].packRef, manifests[2].packRef] },
  { skillRef: 'skill://tenant/tenant_demo/archive-guide@v1', label: 'Archive guide', version: 'v1', scope: 'tenant', targetTokens: 400, description: 'An isolated synthetic procedure. No relationships are supplied in this projection.' },
]
export const catalogInput: ForgeCatalogInput = {
  context: fixtureContext,
  packs: { packs: manifests.map((manifest, i) => ({ pack_ref: manifest.packRef, current_version: manifest.version, contains_phi: i === 9, provenance: i === 11 ? 'authorized-shared' : 'host-approved-synthetic', page_count: manifest.pages.length, updated_at: '2026-10-02T09:00:00Z' })), next_cursor: null },
  skills: { skills: skillMetadata.map(skill => ({ skill_ref: skill.skillRef, scope: skill.scope, current_version: skill.version, updated_at: '2026-10-02T09:00:00Z' })), next_cursor: null },
  manifests, skillMetadata,
  relationships: [
    { sourceRef: `${brandRef}@v14#voice`, targetRef: `${manifests[3].packRef}@v6#feature-language`, kind: 'references', directed: true, origin: 'synthetic', explanation: 'An explicitly supplied, pinned cross-subject page reference in this synthetic fixture.' },
    { sourceRef: `${manifests[4].packRef}#launch-narrative`, targetRef: `${brandRef}#messaging-principles`, kind: 'references', directed: true, origin: 'synthetic', explanation: 'The host supplied this current-version cross-subject reference; no body was downloaded or parsed.' },
    ...[1, 2, 4, 5, 8, 10].map(index => ({ sourceRef: manifests[index].packRef, targetRef: manifests[(index + 2) % manifests.length].packRef, kind: 'references', directed: true, origin: 'synthetic' as const, explanation: 'Explicit synthetic relationship supplied by the authorized host projection.' })),
    { sourceRef: manifests[10].packRef, targetRef: manifests[11].packRef, kind: 'shared', directed: true, origin: 'host-supplied', explanation: 'Read-only shared Pack is visible through an explicitly authorized synthetic grant projection; the renderer grants no access.' },
  ], completeness: 'complete',
}
export const acmeGraph = normalizeForgeCatalog(catalogInput)
export const summaryGraph = normalizeForgeCatalog({ context: { ...fixtureContext, graphRevision: 'summary-2026-10-02' }, packs: catalogInput.packs, skills: catalogInput.skills, completeness: 'partial' })
export const initialNodeId = forgeNodeId(brandRef, fixtureContext)!
