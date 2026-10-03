import type { BrainFilters, BrainGraph, BrainHierarchy, GraphProjection, PresentationEdge, PresentationNode } from './types'
import { groupAncestors, groupMembers } from './hierarchy'
import { createGraphIndex, neighborhood } from './graph-index'

export function projectGraph(graph: BrainGraph, hierarchy: BrainHierarchy, expandedGroups: readonly string[], filters: BrainFilters, selectedId: string | null = null): GraphProjection {
  const expanded = new Set(expandedGroups), groups = new Map(hierarchy.groups.map(group => [group.id, group]))
  const memberships = new Map<string, typeof hierarchy.memberships[number][]>()
  for (const member of hierarchy.memberships) memberships.set(member.nodeId, [...(memberships.get(member.nodeId) ?? []), member])
  const neighbors = selectedId && filters.neighborhood ? neighborhood(createGraphIndex(graph), selectedId, filters.neighborhood) : null
  const inGroup = filters.groupId ? groupMembers(hierarchy, filters.groupId) : null
  const query = filters.query.trim().toLocaleLowerCase()
  const eligible = graph.nodes.filter(node => (!filters.kinds.length || filters.kinds.includes(node.kind)) && (!neighbors || neighbors.has(node.id)) && (!inGroup || inGroup.has(node.id)) && (!query || `${node.label} ${node.canonicalRef ?? ''}`.toLocaleLowerCase().includes(query)))
  const nodes: PresentationNode[] = [], canonicalToVisible = new Map<string, string>(), aggregates = new Map<string, Set<string>>()
  for (const node of eligible) {
    const placements = memberships.get(node.id) ?? []
    const primary = placements.find(member => !member.aliasId) ?? placements[0]
    const collapsed = primary ? groupAncestors(hierarchy, primary.groupId).find(id => !expanded.has(id)) : undefined
    if (collapsed) {
      const id = `aggregate:${collapsed}`
      if (!aggregates.has(collapsed)) aggregates.set(collapsed, new Set())
      aggregates.get(collapsed)!.add(node.id); canonicalToVisible.set(node.id, id)
    } else {
      nodes.push({ ...node, canonicalId: node.id }); canonicalToVisible.set(node.id, node.id)
      for (const member of placements.filter(member => member.aliasId)) {
        if (groupAncestors(hierarchy, member.groupId).every(id => expanded.has(id))) nodes.push({ ...node, id: member.aliasId!, canonicalId: node.id })
      }
    }
  }
  for (const [groupId, members] of aggregates) {
    const group = groups.get(groupId)!
    nodes.push({ id: `aggregate:${groupId}`, label: group.label, kind: 'aggregate', sourceNamespace: 'presentation', groupId, memberIds: [...members], loadedCount: members.size, totalCount: group.totalCount, metrics: { loadedCount: members.size } })
  }
  const combined = new Map<string, PresentationEdge>()
  for (const edge of graph.edges) {
    const source = canonicalToVisible.get(edge.source), target = canonicalToVisible.get(edge.target)
    if (!source || !target || (source === target && edge.source !== edge.target)) continue
    const summarized = source !== edge.source || target !== edge.target
    const key = summarized ? JSON.stringify([source, target, edge.kind, edge.directed, edge.evidence.origin]) : edge.id
    const existing = combined.get(key)
    combined.set(key, existing ? { ...existing, count: (existing.count ?? 1) + 1, originalEdgeIds: [...(existing.originalEdgeIds ?? []), edge.id] } : { ...edge, id: summarized ? `summary:${key}` : edge.id, source, target, count: 1, originalEdgeIds: [edge.id] })
  }
  return { nodes, edges: [...combined.values()], canonicalToVisible, hiddenNodeCount: graph.nodes.length - eligible.length }
}
export function composeGraphs(scopeKey: string, revision: string, graphs: readonly BrainGraph[], crossSourceEdges: BrainGraph['edges'] = []): BrainGraph {
  if (graphs.some(graph => graph.scopeKey !== scopeKey)) throw new Error('Scope mismatch')
  const nodes = graphs.flatMap(graph => [...graph.nodes])
  if (new Set(nodes.map(node => node.id)).size !== nodes.length) throw new Error('Namespaced identity collision')
  const edges = [...graphs.flatMap(graph => [...graph.edges]), ...crossSourceEdges]
  const ids = new Set(nodes.map(node => node.id))
  if (edges.some(edge => !ids.has(edge.source) || !ids.has(edge.target))) throw new Error('Cross-source endpoint unavailable')
  return { schemaVersion: '1', scopeKey, revision, nodes, edges, completeness: graphs.every(graph => graph.completeness === 'complete') ? 'complete' : 'partial' }
}
