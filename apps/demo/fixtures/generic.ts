import type { BrainGraph, BrainPreset } from '../../../packages/brain/src/core/types'
import { buildHierarchy, metadataString } from '../../../packages/brain/src/core/hierarchy'
import { namespacedId } from '../../../packages/brain/src/core/identity'
export const engineeringPreset: BrainPreset = {
  id: 'engineering', nodeKinds: {
    document: { label: 'Document', color: '#62d9ca', shape: 'square', glyph: 'D' },
    procedure: { label: 'Procedure', color: '#e8bd72', shape: 'diamond', glyph: 'P' },
    system: { label: 'System', color: '#b8a1e8', shape: 'hexagon', glyph: 'S' },
  },
  hierarchy: graph => buildHierarchy(graph, [{ id: 'team', label: 'Engineering teams', order: 0, groupBy: node => { const team = metadataString(node, 'region') ?? 'Platform'; return { key: team, label: team } } }]),
}
export function createEngineeringGraph(): BrainGraph {
  const scopeKey = 'synthetic:engineering', sourceNamespace = 'engineering-demo'
  const titles = ['System architecture', 'API conventions', 'Service contracts', 'Release procedure', 'Incident response', 'Reliability guide', 'Authentication design', 'Database schema', 'Migration procedure', 'Testing strategy', 'Observability', 'Deployment system', 'Design system', 'Accessibility guide', 'Review procedure', 'Component patterns', 'Performance budget', 'Frontend system', 'Runbook index', 'On-call procedure', 'Backup strategy', 'Recovery checklist', 'Threat model', 'Platform system']
  const nodes = titles.map((label, i) => ({ id: namespacedId(scopeKey, sourceNamespace, `document-${i}`), sourceNamespace, label, kind: i % 6 === 5 ? 'system' : label.includes('procedure') ? 'procedure' : 'document', version: `rev-${(i % 3) + 1}`, canonicalRef: `docs:engineering/${i}`, metrics: { targetTokens: 300 + i * 65, contentBytes: 800 + i * 240 }, metadata: { region: ['Platform', 'Data', 'Experience', 'Operations'][Math.floor(i / 6)], completeness: 'metadata', provenance: 'synthetic engineering documentation', evidence: 'Explicit fictional engineering projection', synthetic: true } }))
  return { schemaVersion: '1', scopeKey, revision: 'engineering-r1', nodes, edges: nodes.slice(1).map((node, i) => ({ id: `link-${i}`, source: nodes[Math.max(0, i - (i % 4))].id, target: node.id, kind: i % 3 === 0 ? 'requires' : 'references', directed: true, evidence: { origin: 'synthetic' }, metadata: { explanation: 'Explicit relationship in the synthetic engineering-document dataset; no Forge assumptions.' } })), completeness: 'complete' }
}
export const engineeringGraph = createEngineeringGraph()
export function createStressGraph(count: 100 | 1000 | 5000): BrainGraph {
  const scopeKey = `synthetic:stress:${count}`, sourceNamespace = 'stress-fixture'
  const nodes = Array.from({ length: count }, (_, i) => ({ id: namespacedId(scopeKey, sourceNamespace, `node-${i}`), label: `Synthetic ${i % 10 === 0 ? 'procedure' : 'document'} ${i + 1}`, kind: i % 10 === 0 ? 'procedure' : 'document', sourceNamespace, metrics: { targetTokens: (i * 137) % 2000 }, metadata: { region: `Region ${Math.floor(i / 50) + 1}`, synthetic: true } }))
  const edges = nodes.flatMap((node, i) => i === 0 ? [] : [{ id: `edge-${i}`, source: nodes[Math.floor((i - 1) / 3)].id, target: node.id, kind: 'references', directed: true, evidence: { origin: 'synthetic' as const } }, ...(i > 3 && i % 4 === 0 ? [{ id: `cross-${i}`, source: node.id, target: nodes[i - 3].id, kind: 'requires', directed: true, evidence: { origin: 'synthetic' as const } }] : [])])
  return { schemaVersion: '1', scopeKey, revision: `stress-${count}-r1`, nodes, edges, completeness: 'complete' }
}
