import type { ResolutionObservation } from '../../../packages/brain/src/core/types'
import { normalizeForgeGenerationReceipt, normalizeForgeInternalReceipt, normalizeForgeResolveResponse } from '../../../packages/brain/src/adapters/forge'
import type { ForgeContextReceiptDto, ForgeInternalReceipt } from '../../../packages/brain/src/adapters/forge'
import { createFailureObservation } from '../../../packages/brain/src/core/resolution'
import { brandRef, fixtureContext, manifests } from './acme'
export type ScenarioId = 'included' | 'budget' | 'generation' | 'redaction' | 'resolve' | 'denied' | 'cycle' | 'historical'
export const scenarios: readonly { id: ScenarioId; label: string; description: string }[] = [
  { id: 'included', label: 'Included context', description: 'Synthetic full internal receipt with explicit per-section inclusion evidence.' },
  { id: 'budget', label: 'Budget drop', description: 'One section was dropped; this is not a partial resolution failure.' },
  { id: 'generation', label: 'Public generation receipt', description: 'Per-section inclusion and redaction remain unknown. Only aggregate accounting and dropped sections are exposed.' },
  { id: 'redaction', label: 'Explicit redaction evidence', description: 'Synthetic host-supplied internal receipt. Richer than either public receipt API.' },
  { id: 'resolve', label: 'Public resolve response', description: 'Top-level resolved references and pages. Redaction and retained section tokens remain unknown.' },
  { id: 'denied', label: 'Policy denied', description: 'Resolution failed. No successful partial result, no receipt and no inferred inaccessible nodes.' },
  { id: 'cycle', label: 'Cycle / depth failure', description: 'An authorized diagnostic, not a valid persisted Forge resource or a chronology of hops.' },
  { id: 'historical', label: 'Historical snapshot', description: 'This receipt describes v12; the currently loaded v14 page must remain unmatched.' },
]
export function createScenario(id: ScenarioId, requestedRefs: readonly string[] = [brandRef]): ResolutionObservation {
  const context = { ...fixtureContext, requestedRefs }
  const receipt: ForgeContextReceiptDto = { trace_id: `synthetic-${id}`, target_model_alias: 'demo-model-alias', compiled_token_count: id === 'generation' || id === 'resolve' ? null : 1120, token_budget_check_deferred: id === 'generation' || id === 'resolve', sections_dropped: id === 'budget' || id === 'generation' ? [{ source_ref: manifests[4].packRef, version: 'v4', page_slug: 'launch-narrative', priority: 3, target_tokens: 480 }] : [], compilation_hash: 'b3:synthetic-fixture-not-a-computed-forge-hash', compiled_at: id === 'historical' ? '2026-08-15T10:00:00Z' : '2026-10-02T09:15:00Z' }
  if (id === 'denied' || id === 'cycle') return createFailureObservation({ id: receipt.trace_id, association: context, requestedRefs, simulated: true, failure: id === 'denied' ? 'policy-denied' : 'cycle-or-depth' })
  if (id === 'generation') return normalizeForgeGenerationReceipt({ ...receipt, context_params_digest: 'synthetic-parameter-digest' }, context)
  if (id === 'resolve') return normalizeForgeResolveResponse({ resolved_refs: [{ ref: `${brandRef}@v14`, resolved_pages: ['voice', 'terminology'], manifest_etag: 'synthetic-etag' }], compiled_prompt: null, receipt }, context)
  const internal: ForgeInternalReceipt = { ...receipt, tenant_id: 'tenant_demo', redaction_applied: id === 'redaction', redactor_engines: id === 'redaction' ? ['synthetic-engine'] : [], total_target_tokens: 1600, resolved_refs: [
    { source_ref: brandRef, kind: 'pack-page', version: id === 'historical' ? 'v12' : 'v14', page_slug: 'voice', body_hash: id === 'historical' ? 'synthetic-historic-hash' : 'synthetic-content-hash-0-0', target_tokens: 180, compiled_token_count: 140, redaction_applied: false, redactor_engine: 'none' },
    ...(id === 'historical' ? [] : [{ source_ref: manifests[3].packRef, kind: 'pack-page', version: 'v6', page_slug: 'feature-language', body_hash: 'synthetic-content-hash-3-1', target_tokens: 500, compiled_token_count: 430, redaction_applied: false, redactor_engine: 'none' }]),
    ...(id === 'redaction' ? [{ source_ref: manifests[9].packRef, kind: 'pack-page', version: 'v3', page_slug: 'phi-marked-metadata', body_hash: 'synthetic-content-hash-9-2', target_tokens: 630, compiled_token_count: 550, redaction_applied: true, redactor_engine: 'synthetic-engine' }] : []),
  ] }
  return normalizeForgeInternalReceipt(internal, context)
}
