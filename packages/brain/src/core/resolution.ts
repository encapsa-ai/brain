import type { BrainGraph, ObservationMatch, ResolutionObservation } from './types'
import { parseForgeRef } from './identity'

export function matchObservation(graph: BrainGraph, observation: ResolutionObservation): readonly ObservationMatch[] {
  if (observation.status === 'failure') return []
  return observation.sections.map(section => {
    const unmatched = (reason: ObservationMatch['reason']): ObservationMatch => ({ section, nodeId: null, reason })
    if (graph.scopeKey !== observation.association.scopeKey) return unmatched('scope-mismatch')
    const parsed = parseForgeRef(section.sourceRef, observation.association.callerTenant)
    const resourceKey = section.resourceKey ?? parsed?.resourceKey
    const version = section.version ?? parsed?.version
    if (!version) return unmatched('unknown-version')
    const candidates = graph.nodes.filter(node => node.sourceNamespace === observation.association.sourceNamespace && node.resourceKey === resourceKey)
    if (!candidates.length) return unmatched('not-in-projection')
    const node = candidates.find(node => node.version === version && (!section.bodyHash || node.contentHash === section.bodyHash))
    if (!node) return unmatched('snapshot-mismatch')
    return { section, nodeId: node.id, reason: 'matched' }
  })
}
export function createFailureObservation(input: Pick<ResolutionObservation, 'id' | 'association' | 'requestedRefs' | 'simulated'> & { failure: 'policy-denied' | 'cycle-or-depth' | 'unavailable' }): ResolutionObservation {
  return { ...input, origin: 'synthetic', status: 'failure', sections: [] }
}
export const illustrativeStages = [
  { label: 'Parse', description: 'Interpret caller-supplied references. This does not authorize them.' },
  { label: 'Policy / access', description: 'The host enforces caller policy and access boundaries.' },
  { label: 'Reference expansion', description: 'Resolve explicit references with bounded depth and cycle checks.' },
  { label: 'Policy checks', description: 'Policy checks can recur during reference expansion; this is a conceptual grouping.' },
  { label: 'Redaction', description: 'Where policy requires redaction, failure is fail-closed. A PHI flag alone does not establish redaction.' },
  { label: 'Compilation / budget', description: 'Deterministic ordering and whole-section budget drops, not guessed per-node token counts.' },
  { label: 'Receipt', description: 'Public receipts expose a subset of the internal compiler receipt. Missing evidence remains unknown.' },
] as const
