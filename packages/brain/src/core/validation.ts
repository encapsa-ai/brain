import type { BrainGraph, BrainHierarchy, Diagnostic } from './types'

export function hasDirectedCycle(pairs: readonly (readonly [string, string])[]): boolean {
  const children = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  for (const [source, target] of pairs) {
    children.set(source, [...(children.get(source) ?? []), target])
    indegree.set(source, indegree.get(source) ?? 0)
    indegree.set(target, (indegree.get(target) ?? 0) + 1)
  }
  const queue = [...indegree].filter(([, n]) => n === 0).map(([id]) => id)
  let visited = 0
  for (let cursor = 0; cursor < queue.length; cursor++) {
    visited++
    for (const target of children.get(queue[cursor]) ?? []) {
      const remaining = (indegree.get(target) ?? 0) - 1
      indegree.set(target, remaining)
      if (remaining === 0) queue.push(target)
    }
  }
  return visited !== indegree.size
}
export function validateGraph(graph: BrainGraph): readonly Diagnostic[] {
  const counts = new Map<Diagnostic['code'], number>()
  const add = (code: Diagnostic['code']) => counts.set(code, (counts.get(code) ?? 0) + 1)
  if (graph.schemaVersion !== '1' || !graph.scopeKey || !graph.revision) add('invalid-graph')
  const ids = new Set<string>()
  for (const node of graph.nodes) {
    if (!node.id || !node.kind || !node.sourceNamespace || typeof node.label !== 'string') add('invalid-node')
    if (ids.has(node.id)) add('duplicate-node')
    ids.add(node.id)
    if (node.metrics && Object.values(node.metrics).some(value => value !== null && !Number.isFinite(value))) add('invalid-node')
  }
  const edges = new Set<string>()
  for (const edge of graph.edges) {
    if (edges.has(edge.id)) add('duplicate-edge')
    edges.add(edge.id)
    if (!ids.has(edge.source) || !ids.has(edge.target)) add('dangling-edge')
  }
  if (hasDirectedCycle(graph.edges.filter(edge => edge.kind === 'contains').map(edge => [edge.source, edge.target] as const))) add('containment-cycle')
  return [...counts].map(([code, count]) => ({ code, count, severity: 'error' }))
}
export function validateHierarchy(graph: BrainGraph, hierarchy: BrainHierarchy): readonly Diagnostic[] {
  const groupIds = new Set(hierarchy.groups.map(group => group.id))
  const nodeIds = new Set(graph.nodes.map(node => node.id))
  const invalid = hierarchy.memberships.filter(member => !groupIds.has(member.groupId) || !nodeIds.has(member.nodeId)).length
    + hierarchy.groups.filter(group => group.parentGroupId && !groupIds.has(group.parentGroupId)).length
    + hierarchy.groups.length - groupIds.size
  const result: Diagnostic[] = invalid ? [{ code: 'invalid-membership', count: invalid, severity: 'error' }] : []
  if (hasDirectedCycle(hierarchy.groups.filter(group => group.parentGroupId).map(group => [group.parentGroupId!, group.id] as const))) result.push({ code: 'containment-cycle', count: 1, severity: 'error' })
  return result
}
