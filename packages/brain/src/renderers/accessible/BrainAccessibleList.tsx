'use client'
import { useId, useState } from 'react'
import { useBrain } from '../../react/BrainProvider'
import { loadedDegree } from '../../core/graph-index'
import { KindGlyph, Icon } from '../../react/components/Icon'
export function BrainAccessibleList({ className = '', showSearch = true }: { className?: string; showSearch?: boolean }) {
  const { graph, index, select, selectedNodeId, nodeStyle, filters, store } = useBrain()
  const [page, setPage] = useState(0)
  const searchId = useId()
  const query = filters.query.trim().toLocaleLowerCase()
  const nodes = graph.nodes.filter(node => (!query || `${node.label} ${node.canonicalRef ?? ''}`.toLocaleLowerCase().includes(query)) && (!filters.kinds.length || filters.kinds.includes(node.kind)))
  const pages = Math.max(1, Math.ceil(nodes.length / 60)), current = Math.min(page, pages - 1)
  return <section className={`brain-accessible-list ${className}`} aria-label="Loaded context node list">
    {showSearch && <label className="brain-search" htmlFor={searchId}><Icon name="search" /><input id={searchId} value={filters.query} placeholder="Search loaded context" aria-label="Search loaded context" onChange={event => { store.setFilters({ ...filters, query: event.target.value }); setPage(0) }} /></label>}
    <p className="brain-muted">{nodes.length.toLocaleString()} loaded entities · labels and supplied references</p>
    <ul className="brain-node-list">
      {nodes.slice(current * 60, (current + 1) * 60).map(node => <li key={node.id}><button className="brain-node-row" aria-label={`${node.label} ${nodeStyle(node).label} · ${loadedDegree(index, node.id)} loaded relationships${node.version ? ` · ${node.version}` : ''}`} title={`${node.label} · ${nodeStyle(node).label} · ${node.version ?? 'version unknown'}`} aria-pressed={selectedNodeId === node.id} onClick={() => select(node.id)}><KindGlyph style={nodeStyle(node)} /><span><strong>{node.label}</strong><span className="brain-node-subtitle">{nodeStyle(node).label} · {loadedDegree(index, node.id)} loaded relationships{node.version ? ` · ${node.version}` : ''}</span></span><Icon name="right" /></button></li>)}
    </ul>
    {!nodes.length && <p className="brain-muted">No matching entities in this loaded projection.</p>}
    {pages > 1 && <div className="brain-pagination"><button className="brain-button" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button><span>{current + 1} / {pages}</span><button className="brain-button" disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>Next</button></div>}
  </section>
}
