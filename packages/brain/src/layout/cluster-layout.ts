import type { LayoutInput, LayoutResult, Position3 } from '../core/types'
import { stableHash } from '../core/identity'
import { boundsFor, regionIndex } from './brain-layout'
export function clusterLayout(input: LayoutInput): LayoutResult {
  const positions: Record<string, Position3> = {}
  for (const node of input.graph.nodes) {
    if (input.signal?.aborted) throw new Error('Layout cancelled')
    if (input.previous?.[node.id]) { const p = input.previous[node.id]; positions[node.id] = [p[0], p[1], input.dimensions === 2 ? 0 : p[2]]; continue }
    const region = regionIndex(node), angle = region * Math.PI / 3 - Math.PI / 2
    const hash = stableHash(`${input.seed}:${node.id}`), theta = (hash % 10007) / 10007 * Math.PI * 2
    const r = node.kind === 'pack' ? 0.25 : 0.4 + ((hash >>> 12) % 997) / 997 * 0.68
    positions[node.id] = [Math.cos(angle) * 2.25 + Math.cos(theta) * r, Math.sin(angle) * 2.0 + Math.sin(theta) * r, input.dimensions === 3 ? ((hash >>> 20) % 100) / 100 - 0.5 : 0]
  }
  return { positions, bounds: boundsFor(positions), scopeKey: input.graph.scopeKey, revision: input.graph.revision }
}
