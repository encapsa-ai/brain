import { defaultNodeKinds, metadataString } from '../../core/hierarchy'
import type { BrainHierarchy, BrainPreset } from '../../core/types'
export const forgePreset: BrainPreset = {
  id: 'forge-default', nodeKinds: defaultNodeKinds,
  hierarchy(graph): BrainHierarchy {
    const groups = new Map<string, BrainHierarchy['groups'][number]>([
      ['workspace', { id: 'workspace', tierId: 'workspace', label: 'Authorized workspace' }],
      ['tenant', { id: 'tenant', parentGroupId: 'workspace', tierId: 'tenant', label: 'Tenant scope' }],
      ['default', { id: 'default', parentGroupId: 'tenant', tierId: 'realm', label: 'Default realm' }],
      ['tenant-skills', { id: 'tenant-skills', parentGroupId: 'tenant', tierId: 'library', label: 'Tenant Skill library' }],
      ['forge-skills', { id: 'forge-skills', parentGroupId: 'workspace', tierId: 'library', label: 'Forge Skill library' }],
    ])
    const memberships: BrainHierarchy['memberships'][number][] = []
    for (const node of graph.nodes) {
      if (node.kind === 'skill') { memberships.push({ nodeId: node.id, groupId: metadataString(node, 'owner') === 'forge' ? 'forge-skills' : 'tenant-skills' }); continue }
      const subject = metadataString(node, 'subjectKind') ?? 'other', subjectId = metadataString(node, 'subjectId') ?? 'loaded'
      const id = `subject:${subject}:${subjectId}`
      const labels: Record<string, string> = { org: 'Organization', user: 'User context', website: 'Website', contentmatrix_project: 'Content projects', vertical_entity: 'Industry knowledge', shareable_agent: 'Shared agents' }
      groups.set(id, { id, parentGroupId: 'default', tierId: 'subject', label: labels[subject] ?? subject })
      if (node.kind === 'page') {
        const containment = graph.edges.find(edge => edge.kind === 'contains' && edge.target === node.id)
        const pack = graph.nodes.find(candidate => candidate.id === containment?.source)
        if (pack) {
          const packGroupId = `pack-group:${pack.id}`
          groups.set(packGroupId, { id: packGroupId, parentGroupId: id, tierId: 'pack', label: pack.label })
          memberships.push({ nodeId: node.id, groupId: packGroupId })
          continue
        }
      }
      memberships.push({ nodeId: node.id, groupId: id })
    }
    return { groups: [...groups.values()], memberships }
  },
}
