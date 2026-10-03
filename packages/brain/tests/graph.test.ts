import { describe, expect, it } from 'vitest'
import { validateGraph, validateHierarchy } from '../src/core/validation'
import { createGraphIndex, findDirectedPath, neighborhood } from '../src/core/graph-index'
import type { BrainGraph } from '../src/core/types'
export const tinyGraph: BrainGraph = { schemaVersion: '1', scopeKey: 'scope', revision: 'r1', completeness: 'complete', nodes: ['a', 'b', 'c'].map(id => ({ id, label: id.toUpperCase(), kind: 'document', sourceNamespace: 'test', contentHash: 'same-hash' })), edges: [{ id: 'ab', source: 'a', target: 'b', kind: 'references', directed: true, evidence: { origin: 'synthetic' } }, { id: 'bc', source: 'b', target: 'c', kind: 'references', directed: true, evidence: { origin: 'synthetic' } }] }
describe('graph validation and traversal', () => {
  it('retains distinct resources with identical hashes', () => expect(validateGraph(tinyGraph)).toEqual([]))
  it('detects duplicate node and edge IDs', () => { expect(validateGraph({ ...tinyGraph, nodes: [...tinyGraph.nodes, tinyGraph.nodes[0]], edges: [...tinyGraph.edges, tinyGraph.edges[0]] }).map(item => item.code)).toEqual(['duplicate-node', 'duplicate-edge']) })
  it('reports dangling endpoints without leaking payloads in diagnostics', () => { const diagnostic = validateGraph({ ...tinyGraph, edges: [{ ...tinyGraph.edges[0], source: 'private-sensitive-id' }] }); expect(diagnostic[0].code).toBe('dangling-edge'); expect(JSON.stringify(diagnostic)).not.toContain('private-sensitive-id') })
  it('allows self-links, multiedges and generic reference cycles', () => expect(validateGraph({ ...tinyGraph, edges: [...tinyGraph.edges, { ...tinyGraph.edges[0], id: 'self', target: 'a' }, { ...tinyGraph.edges[0], id: 'parallel' }, { ...tinyGraph.edges[0], id: 'back', source: 'c', target: 'a' }] })).toEqual([]))
  it('rejects containment cycles', () => { const graph = { ...tinyGraph, edges: [...tinyGraph.edges, { ...tinyGraph.edges[0], id: 'back', source: 'c', target: 'a' }].map(edge => ({ ...edge, kind: 'contains' })) }; expect(validateGraph(graph)).toContainEqual({ code: 'containment-cycle', count: 1, severity: 'error' }) })
  it('rejects presentation cycles and unavailable memberships', () => { expect(validateHierarchy(tinyGraph, { groups: [{ id: 'x', label: 'X', tierId: 't', parentGroupId: 'y' }, { id: 'y', label: 'Y', tierId: 't', parentGroupId: 'x' }], memberships: [{ groupId: 'x', nodeId: 'missing' }] }).map(item => item.code)).toEqual(['invalid-membership', 'containment-cycle']) })
  it('bounds neighborhood traversal through reference cycles', () => { const index = createGraphIndex(tinyGraph); expect([...neighborhood(index, 'a', 1)]).toEqual(['a', 'b']); expect(neighborhood(index, 'a', 2).size).toBe(3) })
  it('finds paths only along established directions', () => { const index = createGraphIndex(tinyGraph); expect(findDirectedPath(index, 'a', 'c')?.map(edge => edge.id)).toEqual(['ab', 'bc']); expect(findDirectedPath(index, 'c', 'a')).toBeNull() })
})
