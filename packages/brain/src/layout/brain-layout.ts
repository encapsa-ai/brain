import type { BrainNode, LayoutInput, LayoutResult, Position3 } from '../core/types'
import { stableHash } from '../core/identity'
import { metadataString } from '../core/hierarchy'

const anchors: readonly Position3[] = [[-1.55, 0.85, 0.45], [-1.8, -0.2, 0.45], [-1.0, -1.15, 0.45], [1.15, 1.1, 0.5], [1.9, 0.05, 0.4], [1.05, -1.1, 0.4]]
const subjects = ['org', 'website', 'contentmatrix_project', 'user', 'vertical_entity', 'shareable_agent']
export function regionIndex(node: BrainNode): number {
  const kind = metadataString(node, 'subjectKind'), region = metadataString(node, 'region') ?? node.sourceNamespace
  const known = subjects.indexOf(kind ?? '')
  return known >= 0 ? known : stableHash(region) % anchors.length
}
export function brainSurface(u: number, v: number, hemisphere: -1 | 1): Position3 {
  const sinV = Math.sin(v), fold = 1 + 0.055 * Math.sin(u * 9 + Math.cos(v * 6)) * Math.sin(v * 7) + 0.028 * Math.cos(u * 17 - v * 5)
  const x = hemisphere * (0.14 + sinV * (1.44 + Math.cos(u) * 1.31) * fold)
  const y = Math.cos(v) * 2.13 * fold + 0.14 * Math.sin(u * 2) * sinV
  const z = Math.sin(u) * sinV * 1.57 * fold
  return [x, y, z]
}
export function boundsFor(positions: Readonly<Record<string, Position3>>): LayoutResult['bounds'] {
  const values = Object.values(positions)
  if (!values.length) return { min: [-1, -1, -1], max: [1, 1, 1] }
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const position of values) for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], position[axis]); max[axis] = Math.max(max[axis], position[axis]) }
  return { min, max }
}
export function brainLayout(input: LayoutInput): LayoutResult {
  const positions: Record<string, Position3> = Object.create(null)
  for (const node of input.graph.nodes) {
    if (input.signal?.aborted) throw new Error('Layout cancelled')
    const prior = input.previous && Object.hasOwn(input.previous, node.id) ? input.previous[node.id] : undefined
    if (prior && prior.every(Number.isFinite)) { positions[node.id] = input.dimensions === 2 ? [prior[0], prior[1], 0] : prior; continue }
    const anchor = node.kind === 'skill' ? [1.65, -0.5, 0.15] : anchors[regionIndex(node)]
    const hash = stableHash(`${input.seed}:${node.id}`), hash2 = stableHash(`${node.id}:${input.seed}:depth`)
    const theta = ((hash % 10007) / 10007) * Math.PI * 2
    const spread = node.kind === 'pack' ? 0.42 : node.kind === 'aggregate' ? 0.7 : 0.88
    const radius = (0.3 + ((hash >>> 12) % 997) / 997 * 0.7) * spread
    let x = anchor[0] + Math.cos(theta) * radius
    const y = Math.max(-1.95, Math.min(1.95, anchor[1] + Math.sin(theta) * radius))
    if (Math.abs(x) < 0.19) x = x < 0 ? -0.19 : 0.19
    const z = input.dimensions === 2 ? 0 : ((hash2 % 1009) / 1009 - 0.32) * 1.65
    positions[node.id] = [x, y, z]
  }
  return { positions, bounds: boundsFor(positions), scopeKey: input.graph.scopeKey, revision: input.graph.revision }
}
