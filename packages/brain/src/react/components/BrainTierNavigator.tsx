'use client'
import { useId } from 'react'
import { useBrain } from '../BrainProvider'
import { groupAncestors, groupMembers } from '../../core/hierarchy'
import type { BrainStore } from '../../core/store'
import { Icon, KindGlyph } from './Icon'
import type { BrainFilters, BrainHierarchy, PresentationGroup } from '../../core/types'

interface GroupRowProps {
  group: PresentationGroup
  depth: number
  hierarchy: BrainHierarchy
  expandedGroups: readonly string[]
  filters: BrainFilters
  store: BrainStore
}

function GroupRow({ group, depth, hierarchy, expandedGroups, filters, store }: GroupRowProps) {
  const children = hierarchy.groups.filter(candidate => candidate.parentGroupId === group.id)
  const expanded = expandedGroups.includes(group.id)
  const members = groupMembers(hierarchy, group.id)
  if (!members.size) return null
  return <li>
    <div className={`brain-tree-row ${filters.groupId === group.id ? 'is-active' : ''}`} style={{ paddingInlineStart: `${10 + depth * 13}px` }}>
      <button className="brain-tree-expand" aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.label}`} onClick={() => store.setExpandedGroups(expanded ? expandedGroups.filter(id => id !== group.id) : [...expandedGroups, group.id])}><Icon name={expanded ? 'down' : 'right'} /></button>
      <button className="brain-tree-name" aria-pressed={filters.groupId === group.id} onClick={() => { store.setFilters({ ...filters, groupId: filters.groupId === group.id ? null : group.id }); if (!expanded) store.setExpandedGroups([...expandedGroups, group.id]) }}><span>{group.label}</span><span className="brain-tree-count" title="Loaded entity count; authoritative total may be unknown">{members.size}</span></button>
    </div>
    {expanded && children.length > 0 && <ul>{children.map(child => <GroupRow key={child.id} group={child} depth={depth + 1} hierarchy={hierarchy} expandedGroups={expandedGroups} filters={filters} store={store} />)}</ul>}
  </li>
}

export function BrainTierNavigator({ onClose }: { onClose?: () => void }) {
  const brain = useBrain(), neighborhoodId = useId()
  const { hierarchy, graph, expandedGroups, store, filters, nodeStyle } = brain
  const counts = new Map<string, number>()
  for (const node of graph.nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1)
  const ancestors = filters.groupId ? groupAncestors(hierarchy, filters.groupId) : []
  const roots = hierarchy.groups.filter(group => !group.parentGroupId)
  return <aside className="brain-navigator" aria-label="Knowledge navigator">
    <div className="brain-panel-heading"><span><Icon name="layers" />Context navigator</span>{onClose && <button className="brain-icon-button" aria-label="Close navigator" onClick={onClose}><Icon name="panel" /></button>}</div>
    <div className="brain-nav-scroll">
      <div className="brain-section-title"><span>Knowledge hierarchy</span><span className="brain-small-badge">{graph.nodes.length}</span></div>
      {ancestors.length > 0 && <nav className="brain-breadcrumbs" aria-label="Hierarchy breadcrumbs"><button onClick={() => store.setFilters({ ...filters, groupId: null })}>All</button>{ancestors.map(id => <button key={id} onClick={() => store.setFilters({ ...filters, groupId: id })}>/ {hierarchy.groups.find(group => group.id === id)?.label}</button>)}<button aria-label="Back one hierarchy level" onClick={() => store.setFilters({ ...filters, groupId: ancestors.at(-2) ?? null })}><Icon name="left" />Back</button></nav>}
      {roots.length ? <ul className="brain-tree">{roots.map(group => <GroupRow key={group.id} group={group} depth={0} hierarchy={hierarchy} expandedGroups={expandedGroups} filters={filters} store={store} />)}</ul> : <p className="brain-help">Flat projection · no presentation groups supplied.</p>}
      <div className="brain-nav-actions"><button onClick={() => store.setExpandedGroups(hierarchy.groups.map(group => group.id))}>Expand all</button><span>·</span><button onClick={() => store.setExpandedGroups([])}>Collapse all</button></div>
      <fieldset className="brain-kind-filters"><legend>Node kinds</legend>{[...counts].map(([kind, count]) => {
        const sample = graph.nodes.find(node => node.kind === kind)!
        const checked = !filters.kinds.length || filters.kinds.includes(kind)
        return <label key={kind}><input type="checkbox" checked={checked} onChange={() => { const current = filters.kinds.length ? filters.kinds : [...counts.keys()]; const next = checked ? current.filter(value => value !== kind) : [...current, kind]; store.setFilters({ ...filters, kinds: next.length ? next : ['__none__'] }) }} /><KindGlyph style={nodeStyle(sample)} /><span>{nodeStyle(sample).label}s</span><span className="brain-tree-count">{count}</span></label>
      })}</fieldset>
      <div className="brain-field"><label htmlFor={neighborhoodId}>Show neighborhood</label><select id={neighborhoodId} value={filters.neighborhood} onChange={event => store.setFilters({ ...filters, neighborhood: Number(event.target.value) as 0 | 1 | 2 })}><option value="0">All loaded context</option><option value="1">1-hop neighborhood</option><option value="2">2-hop neighborhood</option></select></div>
      {(filters.kinds.length > 0 || filters.groupId || filters.neighborhood > 0 || filters.query) && <button className="brain-button brain-clear-filters" onClick={() => store.setFilters({ query: '', kinds: [], groupId: null, neighborhood: 0 })}>Clear filters</button>}
    </div>
    <div className="brain-nav-note"><Icon name="info" /><p>Presentation tiers, not storage or authorization boundaries. Counts reflect loaded data.</p></div>
  </aside>
}
