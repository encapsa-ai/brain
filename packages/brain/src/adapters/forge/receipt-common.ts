import type { ResolutionObservation, SectionObservation } from '../../core/types'
import { parseForgeRef } from '../../core/identity'
import { pageReference } from './catalog'
import type { ForgeAdapterContext, ForgeContextReceiptDto, ForgeDroppedSection } from './wire-types'
export function receiptFields(receipt: ForgeContextReceiptDto) {
  return { traceId: receipt.trace_id, targetModelAlias: receipt.target_model_alias, compiledTokenCount: receipt.compiled_token_count, tokenBudgetCheckDeferred: receipt.token_budget_check_deferred, compilationHash: receipt.compilation_hash, compiledAt: receipt.compiled_at, ...(receipt.context_params_digest ? { contextParamsDigest: receipt.context_params_digest } : {}) }
}
export function observationBase(receipt: ForgeContextReceiptDto, context: ForgeAdapterContext, origin: ResolutionObservation['origin']) {
  return { id: receipt.trace_id, association: { scopeKey: context.scopeKey, graphRevision: context.graphRevision, sourceNamespace: context.sourceNamespace, callerTenant: context.callerTenant }, origin, simulated: context.simulated ?? false, requestedRefs: context.requestedRefs ?? [], status: 'success' as const, receipt: receiptFields(receipt) }
}
export function droppedSections(dropped: readonly ForgeDroppedSection[], context: ForgeAdapterContext): readonly SectionObservation[] {
  return dropped.map(section => {
    const sourceRef = section.page_slug ? pageReference(section.source_ref, section.page_slug) : section.source_ref
    const parsed = parseForgeRef(sourceRef, context.callerTenant)
    return { sourceRef, resourceKey: parsed?.resourceKey, version: section.version, pageSlug: section.page_slug ?? parsed?.pageSlug ?? null, outcome: 'dropped', redactionApplied: null, compiledTokenCount: null, targetTokens: section.target_tokens, priority: section.priority }
  })
}
