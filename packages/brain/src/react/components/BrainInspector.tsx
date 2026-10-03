'use client'
import { useId, useState, type ReactNode } from 'react'
import { useBrain } from '../BrainProvider'
import type { BrainNode } from '../../core/types'
import { findDirectedPath } from '../../core/graph-index'
import { matchObservation } from '../../core/resolution'
import { Icon, KindGlyph } from './Icon'
import { BrainCopyField } from './BrainFieldControls'
export interface BrainInspectorOptions {
  showUnknownVersion?: boolean
  showCompleteness?: boolean
  showMetadataFooter?: boolean
  /** Retained, but opt-in until the host supplies a useful directed graph. */
  showDirectedPaths?: boolean
  labels?: Partial<{ source: string; sourceEvidence: string; version: string; unknownVersion: string; completeness: string; metadataFooter: string }>
}
export interface BrainInspectorProps { renderNodeDetails?: (node: BrainNode) => ReactNode; renderNodeActions?: (node: BrainNode) => ReactNode; onClose?: () => void; showContextActions?: boolean; inspectorOptions?: BrainInspectorOptions }
export function BrainInspector({ renderNodeDetails, renderNodeActions, onClose, showContextActions = true, inspectorOptions = {} }: BrainInspectorProps) {
  const { selectedNodeId, index, graph, select, selectEdge, selectedEdgeId, nodeStyle, edgeStyle, details, observation, store, tray, camera } = useBrain()
  const [tab, setTab] = useState<'details' | 'relationships'>('details'), [pathTarget, setPathTarget] = useState(''), [pathMessage, setPathMessage] = useState('')
  const id = useId()
  if (!selectedNodeId) return null
  const node = index.nodes.get(selectedNodeId)
  if (!node) return <aside className="brain-inspector" aria-label="Selected entity unavailable"><div className="brain-panel-heading"><span>Entity unavailable</span><button className="brain-icon-button" aria-label="Clear unavailable selection" onClick={() => select(null)}><Icon name="close" /></button></div><p className="brain-help">The selected entity is no longer available in this loaded projection. This does not distinguish removed, denied, or not yet loaded.</p></aside>
  const kind = nodeStyle(node), incoming = index.incoming.get(node.id) ?? [], outgoing = index.outgoing.get(node.id) ?? []
  const relationshipCount = new Set([...incoming, ...outgoing].map(edge => edge.id)).size
  const labels = { source: 'Source', sourceEvidence: 'Source field', version: 'Version', unknownVersion: 'Unknown', completeness: 'Completeness', metadataFooter: 'Metadata only · authorized projection', ...inspectorOptions.labels }
  const version = node.version?.trim() && !/^(?:version\s+)?unknown$/i.test(node.version.trim()) ? node.version.trim() : null
  const metadata = node.metadata && typeof node.metadata === 'object' && !Array.isArray(node.metadata) ? node.metadata as Readonly<Record<string, unknown>> : {}
  const matches = observation ? matchObservation(graph, observation).filter(match => match.nodeId === node.id) : []
  const close = () => { select(null); onClose?.() }
  return <aside className="brain-inspector" aria-label="Node inspector">
    <div className="brain-panel-heading"><span>Inspector</span><button className="brain-icon-button" aria-label="Close inspector" onClick={close}><Icon name="close" /></button></div>
    <div className="brain-inspector-identity"><span className="brain-kind-tag"><KindGlyph style={kind} />{kind.label}{(version || inspectorOptions.showUnknownVersion) && <span className="brain-version">{version ?? labels.unknownVersion}</span>}</span><h2>{node.label}</h2><p className="brain-muted">{node.kind === 'skill' ? 'Procedural context' : node.kind === 'page' ? 'Factual context · page' : node.kind === 'pack' ? 'Factual context · knowledge pack' : 'Loaded knowledge entity'}</p></div>
    <div className="brain-inspector-tabs" role="tablist" aria-label="Inspector sections"><button id={`${id}-details-tab`} role="tab" aria-selected={tab === 'details'} aria-controls={`${id}-details`} onClick={() => setTab('details')}>Details</button><button id={`${id}-relations-tab`} role="tab" aria-selected={tab === 'relationships'} aria-controls={`${id}-relations`} onClick={() => setTab('relationships')}>Relationships <span className="brain-relationship-count" aria-label={`${relationshipCount} relationships`}>{relationshipCount}</span></button></div>
    <div className="brain-inspector-scroll">
      {tab === 'details' ? <div role="tabpanel" id={`${id}-details`} aria-labelledby={`${id}-details-tab`}>
        {node.canonicalRef && <div className="brain-detail-block"><h3>Canonical reference</h3><code className="brain-reference">{node.canonicalRef}</code></div>}
        <dl className="brain-metadata">{(version || inspectorOptions.showUnknownVersion) && <div><dt>{labels.version}</dt><dd>{version ?? labels.unknownVersion}</dd></div>}<div><dt>{labels.source}</dt><dd>{typeof metadata.provenance === 'string' ? metadata.provenance : 'Not supplied'}</dd></div>{inspectorOptions.showCompleteness && <div><dt>{labels.completeness}</dt><dd>{typeof metadata.completeness === 'string' ? metadata.completeness : graph.completeness}</dd></div>}{Object.entries(node.metrics ?? {}).map(([key, value]) => <div key={key}><dt>{({ targetTokens: 'Target tokens', contentBytes: 'Content bytes', pageCount: 'Reported pages', loadedPageCount: 'Loaded pages' } as Record<string, string>)[key] ?? key}</dt><dd>{value === null ? 'Unknown' : value.toLocaleString()}</dd></div>)}</dl>
        {metadata.sharedReadOnly === true && <div className="brain-notice">Read-only shared Pack · authorized host projection. The viewer grants no access.</div>}
        {metadata.containsPhi === true && <div className="brain-notice">PHI-marked metadata only. No body supplied. Redaction is unknown unless separately evidenced.</div>}
        {typeof metadata.description === 'string' && metadata.description && <p className="brain-help">{metadata.description}</p>}
        <div className="brain-detail-block"><h3>{labels.sourceEvidence}</h3><BrainCopyField key={`${node.id}:${String(metadata.evidence)}`} label={labels.sourceEvidence} value={typeof metadata.evidence === 'string' ? metadata.evidence : 'Supplied authorized graph projection'} /></div>
        {matches.map((match, i) => <div className="brain-notice" key={i}>{observation?.simulated ? 'Simulated · ' : ''}{match.section.outcome} · redaction {match.section.redactionApplied === null ? 'unknown' : match.section.redactionApplied ? 'applied' : 'not applied'} · retained tokens {match.section.compiledTokenCount ?? 'unknown'}</div>)}
        {observation?.status === 'success' && matches.length === 0 && <p className="brain-help">{observation.simulated ? 'Simulated observation · ' : ''}No matching version-specific outcome is established for this entity.</p>}
        {details.status === 'loading' && <p role="status" className="brain-help">Loading authorized details…</p>}
        {details.status === 'unavailable' && <p role="status" className="brain-help">Additional authorized details are unavailable. Loaded metadata remains visible.</p>}
        {details.status === 'ready' && <div className="brain-detail-block"><h3>Authorized details</h3><dl className="brain-metadata">{details.value.fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.copyable && typeof field.value === 'string' ? <BrainCopyField key={`${node.id}:${field.value}`} label={field.label} value={field.value} /> : field.value === null ? 'Unknown' : String(field.value)}</dd></div>)}</dl>{details.value.authorizedText && <p className="brain-safe-text">{details.value.authorizedText}</p>}</div>}
        {renderNodeDetails?.(node)}
        <div className="brain-detail-block"><h3>Connected context</h3>{outgoing.slice(0, 3).map(edge => <button key={edge.id} className="brain-mini-relation" onClick={() => { selectEdge(edge); setTab('relationships') }}><Icon name="arrow" /><span>{index.nodes.get(edge.target)?.label ?? 'Unavailable'}<small>{edgeStyle(edge).label}</small></span><Icon name="right" /></button>)}{!outgoing.length && <p className="brain-help">No known outgoing connection in this loaded projection.</p>}</div>
      </div> : <div role="tabpanel" id={`${id}-relations`} aria-labelledby={`${id}-relations-tab`}>
        {(['outgoing', 'incoming'] as const).map(direction => <div className="brain-detail-block" key={direction}><h3>{direction === 'outgoing' ? 'Outgoing' : 'Incoming'} relationships</h3>{(direction === 'outgoing' ? outgoing : incoming).map(edge => {
          const other = index.nodes.get(edge.source === node.id ? edge.target : edge.source)
          const explanation = edge.metadata && typeof edge.metadata === 'object' && !Array.isArray(edge.metadata) ? (edge.metadata as Record<string, unknown>).explanation : null
          return <button key={edge.id} className="brain-relation" aria-label={`${edgeStyle(edge).label} · ${edge.directed ? 'directed' : 'undirected'} ${other?.label ?? 'Unavailable'}. ${index.nodes.get(edge.source)?.label} ${edge.directed ? 'to' : 'and'} ${index.nodes.get(edge.target)?.label}. Evidence ${edge.evidence.origin}. ${typeof explanation === 'string' ? explanation : 'Explicit supplied relationship.'}`} aria-pressed={selectedEdgeId === edge.id} onClick={() => selectEdge(edge)}><span className="brain-relation-type"><Icon name={direction === 'outgoing' ? 'arrow' : 'left'} />{edgeStyle(edge).label} · {edge.directed ? 'directed' : 'undirected'}</span><strong>{other?.label ?? 'Unavailable'}</strong><span className="brain-relation-direction">{index.nodes.get(edge.source)?.label} {edge.directed ? '→' : '↔'} {index.nodes.get(edge.target)?.label}</span><small>{typeof explanation === 'string' ? explanation : 'Explicit relationship supplied in the loaded projection.'}</small><small>Evidence: {edge.evidence.origin}</small></button>
        })}{!(direction === 'outgoing' ? outgoing : incoming).length && <p className="brain-help">No known {direction} connection in this loaded projection.</p>}</div>)}
        {inspectorOptions.showDirectedPaths && <div className="brain-field"><label htmlFor={`${id}-path`}>Directed path to another entity</label><select id={`${id}-path`} value={pathTarget} onChange={event => { setPathTarget(event.target.value); setPathMessage('') }}><option value="">Choose endpoint</option>{graph.nodes.filter(other => other.id !== node.id).slice(0, 1000).map(other => <option key={other.id} value={other.id}>{other.label}</option>)}</select><button className="brain-button" disabled={!pathTarget} onClick={() => { const path = findDirectedPath(index, node.id, pathTarget); setPathMessage(path ? `${path.length} explicit directed edge${path.length === 1 ? '' : 's'}: ${[node.label, ...path.map(edge => index.nodes.get(edge.target)?.label)].join(' → ')}` : 'No known directed path in this loaded projection. This does not prove no connection exists.'); if (path?.length) { store.setEdge(path[0].id); camera.send({ type: 'focus', nodeIds: [node.id, pathTarget] }) } }}>Find loaded path</button><p className="brain-help" role="status">{pathMessage}</p></div>}
      </div>}
    </div>
    {((showContextActions && node.canonicalRef) || renderNodeActions || inspectorOptions.showMetadataFooter) && <div className="brain-inspector-footer">{showContextActions && node.canonicalRef && <button className="brain-button brain-button-primary" disabled={tray.includes(node.id)} onClick={() => store.addToTray(node.id)}><Icon name={tray.includes(node.id) ? 'check' : 'plus'} />{tray.includes(node.id) ? 'Added to context' : 'Add to context'}</button>}{renderNodeActions?.(node)}{inspectorOptions.showMetadataFooter && <span className="brain-muted">{labels.metadataFooter}</span>}</div>}
  </aside>
}
