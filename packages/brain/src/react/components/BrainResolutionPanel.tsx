'use client'
import { useState, type ReactNode } from 'react'
import { useBrain } from '../BrainProvider'
import { matchObservation, illustrativeStages } from '../../core/resolution'
import { Icon } from './Icon'
export type ExplorerMode = 'inventory' | 'composition' | 'receipt' | 'illustrative'
export function BrainResolutionPanel({ illustrative = false, controls }: { illustrative?: boolean; controls?: ReactNode }) {
  const { observation, graph, select, store } = useBrain()
  const [expanded, setExpanded] = useState(true), [stage, setStage] = useState(0)
  if (!illustrative && !observation && !controls) return null
  const matches = observation ? matchObservation(graph, observation) : []
  return <section className="brain-resolution-panel" aria-label={illustrative ? 'Illustrative conceptual pipeline' : 'Resolution observation'}>
    <div className="brain-resolution-heading"><button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><Icon name={expanded ? 'down' : 'right'} /><strong>{illustrative ? 'Illustrative sequence' : 'Resolution receipt'}</strong></button>{(illustrative || observation?.simulated) && <span className="brain-simulation-badge">{illustrative ? 'Not live telemetry' : 'Simulated'}</span>}{observation && !illustrative && <button className="brain-icon-button" aria-label="Clear observation" onClick={() => store.setObservation(null)}><Icon name="close" /></button>}</div>
    {expanded && <div className="brain-resolution-content">
      {controls}
      {illustrative ? <><p className="brain-help">Illustrative sequence, not live execution telemetry. Policy checks can recur during expansion.</p><ol className="brain-pipeline">{illustrativeStages.map((item, i) => <li key={item.label}><button aria-current={i === stage ? 'step' : undefined} onClick={() => setStage(i)}>{item.label}</button>{i < illustrativeStages.length - 1 && <Icon name="right" />}</li>)}</ol><p>{illustrativeStages[stage].description}</p><div className="brain-pipeline-controls"><button className="brain-button" disabled={stage === 0} onClick={() => setStage(stage - 1)}>Previous stage</button><span>{stage + 1} / {illustrativeStages.length}</span><button className="brain-button" disabled={stage === illustrativeStages.length - 1} onClick={() => setStage(stage + 1)}>Next stage</button></div></> : observation ? <>
        {observation.status === 'failure' ? <div className="brain-notice brain-notice-error"><strong>Resolution failed · {observation.failure}</strong><p>No successful partial result. No receipt or inaccessible-resource inventory is inferred.</p></div> : <>
          <div className="brain-receipt-stats"><span><small>Compiled tokens</small><strong>{observation.receipt.compiledTokenCount?.toLocaleString() ?? 'Unknown'}</strong></span><span><small>Accounting</small><strong>{observation.receipt.tokenBudgetCheckDeferred ? 'Deferred' : 'Reported'}</strong></span><span><small>Evidence origin</small><strong>{observation.origin}</strong></span></div>
          <p className="brain-help">{observation.origin === 'public-generation' ? 'Public generation receipts do not establish retained sections or per-section redaction.' : observation.origin === 'public-resolve' ? 'Resolved references are not per-section inclusion or redaction evidence.' : 'Explicit host-supplied full internal receipt · richer than public API receipts.'}</p>
          <p className="brain-help">Receipt: <time dateTime={observation.receipt.compiledAt}>{observation.receipt.compiledAt.replace('T', ' ').replace('Z', ' UTC')}</time> · graph snapshot: {observation.association.graphRevision}{observation.association.graphRevision !== graph.revision ? ' · snapshot differs; only exact version/hash matches are colored' : ''}</p>
          <ul className="brain-outcomes">{matches.map((match, i) => <li key={i}><span className={`brain-outcome-label is-${match.section.outcome}`}>{match.section.outcome === 'included' ? '✓' : match.section.outcome === 'dropped' ? '−' : '→'} {match.section.outcome}</span><button className="brain-text-button" disabled={!match.nodeId} onClick={() => match.nodeId && select(match.nodeId)}>{match.nodeId ? graph.nodes.find(node => node.id === match.nodeId)?.label : match.section.sourceRef}</button><span>{match.section.version ?? 'Version unknown'} · {match.reason === 'matched' ? match.section.redactionApplied === null ? 'redaction unknown' : match.section.redactionApplied ? 'redaction applied' : 'no redaction' : `Unmatched: ${match.reason}`}</span></li>)}</ul>
          {!matches.length && <p className="brain-help">No per-section outcomes supplied. Inclusion and redaction remain unknown.</p>}
          <details className="brain-receipt-evidence"><summary>Receipt evidence</summary><dl><dt>Trace ID</dt><dd><code>{observation.receipt.traceId}</code></dd><dt>Supplied compilation hash</dt><dd><code>{observation.receipt.compilationHash}</code></dd><dt>Target model alias</dt><dd>{observation.receipt.targetModelAlias}</dd>{observation.receipt.contextParamsDigest && <><dt>Parameter digest</dt><dd><code>{observation.receipt.contextParamsDigest}</code></dd></>}</dl></details>
        </>}
      </> : <p className="brain-help">Choose an externally supplied observation. No generation calls are made by this library.</p>}
    </div>}
  </section>
}
