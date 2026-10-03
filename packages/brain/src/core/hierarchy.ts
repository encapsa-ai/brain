import type { BrainGraph, BrainHierarchy, BrainNode, BrainPreset, KindStyle, PresentationGroup, PresentationMembership, TierDefinition } from './types'
import { namespacedId } from './identity'

export const emptyHierarchy: BrainHierarchy = { groups: [], memberships: [] }
export function buildHierarchy(graph: BrainGraph, tiers: readonly TierDefinition[], visibilityLevel = Infinity): BrainHierarchy {
  const groups = new Map<string, PresentationGroup>(), memberships: PresentationMembership[] = []
  for (const node of graph.nodes) {
    let parentGroupId: string | undefined
    for (const tier of [...tiers].sort((a, b) => a.order - b.order)) {
      if ((tier.minVisibilityLevel ?? 0) > visibilityLevel) continue
      const group = tier.groupBy(node)
      if (!group) continue
      const id = namespacedId(graph.scopeKey, tier.id, `${parentGroupId ?? ''}/${group.key}`)
      groups.set(id, { id, label: group.label, tierId: tier.id, parentGroupId })
      parentGroupId = id
    }
    if (parentGroupId) memberships.push({ nodeId: node.id, groupId: parentGroupId })
  }
  return { groups: [...groups.values()], memberships }
}
export function getHierarchy(graph: BrainGraph, preset?: BrainPreset): BrainHierarchy {
  if (typeof preset?.hierarchy === 'function') return preset.hierarchy(graph)
  return preset?.hierarchy ?? (preset?.tiers ? buildHierarchy(graph, preset.tiers) : emptyHierarchy)
}
export function groupAncestors(hierarchy: BrainHierarchy, groupId: string): readonly string[] {
  const groups = new Map(hierarchy.groups.map(group => [group.id, group]))
  const ids: string[] = [], seen = new Set<string>()
  let current: string | undefined = groupId
  while (current && !seen.has(current)) { ids.unshift(current); seen.add(current); current = groups.get(current)?.parentGroupId }
  return ids
}
export function groupMembers(hierarchy: BrainHierarchy, groupId: string): ReadonlySet<string> {
  return new Set(hierarchy.memberships.filter(member => groupAncestors(hierarchy, member.groupId).includes(groupId)).map(member => member.nodeId))
}
export function metadataString(node: BrainNode, key: string): string | undefined {
  if (!node.metadata || typeof node.metadata !== 'object' || Array.isArray(node.metadata)) return undefined
  const value = (node.metadata as Readonly<Record<string, unknown>>)[key]
  return typeof value === 'string' ? value : undefined
}
export const defaultNodeKinds: Readonly<Record<string, KindStyle>> = {
  pack: { label: 'Pack', color: '#62d9ca', shape: 'hexagon', glyph: 'P' },
  page: { label: 'Page', color: '#84bdd6', shape: 'circle', glyph: '•' },
  skill: { label: 'Skill', color: '#e8bd72', shape: 'diamond', glyph: 'S' },
  aggregate: { label: 'Group', color: '#9aa7bc', shape: 'square', glyph: '+' },
}
export const flatPreset: BrainPreset = { id: 'generic-flat', nodeKinds: defaultNodeKinds }
export function resolveNodeStyle(kind: string, preset?: BrainPreset): KindStyle {
  return preset?.nodeKinds?.[kind] ?? defaultNodeKinds[kind] ?? { label: kind, color: '#a6b5c6', shape: 'square', glyph: '?' }
}
export function resolveEdgeStyle(kind: string, preset?: BrainPreset) {
  return preset?.edgeKinds?.[kind] ?? ({
    contains: { label: 'Contains', color: '#8b9aaa', dashed: false },
    references: { label: 'References', color: '#b8a1e8', dashed: false },
    declares: { label: 'Declares context', color: '#e8bd72', dashed: true },
    shared: { label: 'Authorized sharing', color: '#62d9ca', dashed: true },
  }[kind] ?? { label: kind, color: '#8b9aaa', dashed: true })
}
