import type { BrainEdge, BrainGraph, GraphIndex } from './types'
export function createGraphIndex(graph: BrainGraph): GraphIndex {
  const incoming = new Map<string, BrainEdge[]>(), outgoing = new Map<string, BrainEdge[]>()
  for (const node of graph.nodes) { incoming.set(node.id, []); outgoing.set(node.id, []) }
  for (const edge of graph.edges) {
    incoming.get(edge.target)?.push(edge); outgoing.get(edge.source)?.push(edge)
    if (!edge.directed && edge.source !== edge.target) { incoming.get(edge.source)?.push(edge); outgoing.get(edge.target)?.push(edge) }
  }
  return { nodes: new Map(graph.nodes.map(node => [node.id, node])), incoming, outgoing }
}
export function neighborhood(index: GraphIndex, id: string, hops: 1 | 2): ReadonlySet<string> {
  const seen = new Set([id]); let frontier = [id]
  for (let depth = 0; depth < hops; depth++) {
    const next: string[] = []
    for (const nodeId of frontier) for (const edge of [...(index.incoming.get(nodeId) ?? []), ...(index.outgoing.get(nodeId) ?? [])]) {
      const other = edge.source === nodeId ? edge.target : edge.source
      if (!seen.has(other)) { seen.add(other); next.push(other) }
    }
    frontier = next
  }
  return seen
}
export function findDirectedPath(index: GraphIndex, from: string, to: string): readonly BrainEdge[] | null {
  if (!index.nodes.has(from) || !index.nodes.has(to)) return null
  const queue = [from], seen = new Set([from]), via = new Map<string, { previous: string; edge: BrainEdge }>()
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]
    if (current === to) {
      const result: BrainEdge[] = []; let cursor = to
      while (cursor !== from) { const step = via.get(cursor)!; result.unshift(step.edge); cursor = step.previous }
      return result
    }
    for (const edge of index.outgoing.get(current) ?? []) {
      const next = edge.source === current ? edge.target : edge.source
      if (!seen.has(next)) { seen.add(next); via.set(next, { previous: current, edge }); queue.push(next) }
    }
  }
  return null
}
export function loadedDegree(index: GraphIndex, id: string): number {
  return new Set([...(index.incoming.get(id) ?? []), ...(index.outgoing.get(id) ?? [])].map(edge => edge.id)).size
}
