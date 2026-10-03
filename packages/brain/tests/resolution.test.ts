import { describe, expect, it } from 'vitest'
import { matchObservation } from '../src/core/resolution'
import { acmeGraph, summaryGraph, fixtureContext } from '../../../apps/demo/fixtures/acme'
import { createScenario } from '../../../apps/demo/fixtures/scenarios'
import { normalizeForgeGenerationReceipt } from '../src/adapters/forge'
describe('version-specific observation matching', () => {
  it('does not match an unparseable reference to a generic node with no resource key', () => {
    const observation = createScenario('included')
    if (observation.status !== 'success') throw new Error('Expected synthetic success')
    const graph = { ...acmeGraph, nodes: [{ id: 'generic', label: 'Generic', kind: 'page', sourceNamespace: fixtureContext.sourceNamespace, version: 'v1' }], edges: [] }
    const sections = [{ ...observation.sections[0], sourceRef: 'malformed', resourceKey: undefined, version: 'v1', bodyHash: undefined }]
    expect(matchObservation(graph, { ...observation, sections })[0]).toMatchObject({ nodeId: null, reason: 'not-in-projection' })
  })
  it('matches actual version and page identity', () => { const matches = matchObservation(acmeGraph, createScenario('included')); expect(matches).toHaveLength(2); expect(matches.every(match => match.reason === 'matched')).toBe(true); expect(matches.every(match => acmeGraph.nodes.find(node => node.id === match.nodeId)?.kind === 'page')).toBe(true) })
  it('never colors current pages for historic receipts', () => { const matches = matchObservation(acmeGraph, createScenario('historical')); expect(matches).toHaveLength(1); expect(matches[0]).toMatchObject({ nodeId: null, reason: 'snapshot-mismatch' }) })
  it('fails matching closed across scopes even if resource keys are identical', () => expect(matchObservation({ ...acmeGraph, scopeKey: 'other' }, createScenario('included')).every(match => match.reason === 'scope-mismatch' && match.nodeId === null)).toBe(true))
  it('keeps absent pages distinct from denied versus deleted', () => expect(matchObservation(summaryGraph, createScenario('included')).every(match => match.reason === 'not-in-projection')).toBe(true))
  it('can match exact version/hash evidence across different graph revisions without claiming latest', () => expect(matchObservation({ ...acmeGraph, revision: 'metadata-only-new-revision' }, createScenario('included')).every(match => match.reason === 'matched')).toBe(true))
  it('preserves failure as no successful partial result', () => { for (const id of ['denied', 'cycle'] as const) { const observation = createScenario(id); expect(observation.status).toBe('failure'); expect(observation.sections).toEqual([]); expect(observation.receipt).toBeUndefined(); expect(matchObservation(acmeGraph, observation)).toEqual([]) } })
  it('requested refs do not establish inclusion', () => { const observation = normalizeForgeGenerationReceipt({ trace_id: 't', target_model_alias: 'm', compiled_token_count: null, token_budget_check_deferred: true, sections_dropped: [], compilation_hash: 'b3:fixture', compiled_at: '2026-10-02T00:00:00Z' }, { ...fixtureContext, requestedRefs: ['pack://org/org_acme/brand-voice'] }); expect(observation.requestedRefs).toHaveLength(1); expect(observation.sections).toHaveLength(0); expect(matchObservation(acmeGraph, observation)).toEqual([]) })
  it('all synthetic scenarios visibly carry simulation status', () => { for (const id of ['included', 'budget', 'generation', 'redaction', 'resolve', 'denied', 'cycle', 'historical'] as const) expect(createScenario(id).simulated).toBe(true) })
})
