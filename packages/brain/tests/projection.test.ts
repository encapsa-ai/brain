import { describe, expect, it } from 'vitest'
import { projectGraph, composeGraphs } from '../src/core/projection'
import { defaultFilters } from '../src/core/store'
import { buildHierarchy, resolveNodeStyle } from '../src/core/hierarchy'
import type { BrainGraph, BrainHierarchy } from '../src/core/types'
const graph: BrainGraph = { schemaVersion: '1', scopeKey: 's', revision: 'r', completeness: 'partial', nodes: ['a', 'b', 'c'].map(id => ({ id, kind: 'note', label: id, sourceNamespace: 's' })), edges: [
  { id: 'ac', source: 'a', target: 'c', kind: 'references', directed: true, evidence: { origin: 'manifest' } },
  { id: 'bc', source: 'b', target: 'c', kind: 'references', directed: true, evidence: { origin: 'manifest' } },
  { id: 'host', source: 'a', target: 'c', kind: 'references', directed: true, evidence: { origin: 'host-supplied' } },
  { id: 'ca', source: 'c', target: 'a', kind: 'references', directed: true, evidence: { origin: 'manifest' } },
] }
const hierarchy: BrainHierarchy = { groups: [{ id: 'g', label: 'Group', tierId: 'custom' }], memberships: [{ nodeId: 'a', groupId: 'g' }, { nodeId: 'b', groupId: 'g' }] }
describe('lossless presentation projection', () => {
  it('uses exact unique loaded counts without inventing authoritative totals', () => { const view = projectGraph(graph, hierarchy, [], defaultFilters); const aggregate = view.nodes.find(node => node.kind === 'aggregate')!; expect(aggregate.loadedCount).toBe(2); expect(aggregate.totalCount).toBeUndefined(); expect(graph.nodes).toHaveLength(3) })
  it('summarizes directed edges independently by kind and evidence', () => { const view = projectGraph(graph, hierarchy, [], defaultFilters); expect(view.edges).toHaveLength(3); expect(view.edges.find(edge => edge.count === 2)?.originalEdgeIds).toEqual(['ac', 'bc']); expect(view.edges.find(edge => edge.source === 'c')?.target).toBe('aggregate:g') })
  it('expands without losing canonical edges', () => { const view = projectGraph(graph, hierarchy, ['g'], defaultFilters); expect(view.nodes.map(node => node.id)).toEqual(graph.nodes.map(node => node.id)); expect(view.edges.map(edge => edge.id)).toEqual(graph.edges.map(edge => edge.id)) })
  it('aliases select a single canonical entity', () => { const view = projectGraph(graph, { groups: [...hierarchy.groups, { id: 'other', label: 'Other', tierId: 't' }], memberships: [...hierarchy.memberships, { nodeId: 'a', groupId: 'other', aliasId: 'placement-a' }] }, ['g', 'other'], defaultFilters); expect(view.nodes.find(node => node.id === 'placement-a')?.canonicalId).toBe('a'); expect(graph.nodes.filter(node => node.id === 'a')).toHaveLength(1) })
  it('filters a projection without mutating host objects', () => { const original = JSON.stringify(graph); expect(projectGraph(graph, hierarchy, ['g'], { ...defaultFilters, query: 'a' }).nodes).toHaveLength(1); expect(JSON.stringify(graph)).toBe(original) })
  it('supports user-defined tier order and visibility minimum', () => { const result = buildHierarchy(graph, [{ id: 'kind', label: 'Kinds', order: 4, groupBy: node => ({ key: node.kind, label: node.kind }) }, { id: 'deep', label: 'Deep', order: 5, minVisibilityLevel: 3, groupBy: node => ({ key: node.id, label: node.label }) }], 1); expect(result.groups).toHaveLength(1); expect(result.groups[0].tierId).toBe('kind') })
  it('renders unknown kinds neutrally without rewriting them', () => expect(resolveNodeStyle('host-custom')).toMatchObject({ label: 'host-custom', shape: 'square' }))
  it('composes namespaced sources only under an explicit shared authorization scope', () => { expect(composeGraphs('s', 'composed', [graph, { ...graph, nodes: [{ id: 'external', label: 'External', kind: 'document', sourceNamespace: 'other' }], edges: [] }]).nodes).toHaveLength(4); expect(() => composeGraphs('wrong', 'r', [graph])).toThrow('Scope mismatch'); expect(() => composeGraphs('s', 'r', [graph, graph])).toThrow('Namespaced identity collision') })
})
