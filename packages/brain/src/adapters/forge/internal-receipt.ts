import type { ResolutionObservation, SectionObservation } from '../../core/types'
import { parseForgeRef } from '../../core/identity'
import { pageReference } from './catalog'
import { droppedSections, observationBase } from './receipt-common'
import type { ForgeAdapterContext, ForgeInternalReceipt } from './wire-types'
export function normalizeForgeInternalReceipt(receipt: ForgeInternalReceipt, context: ForgeAdapterContext): ResolutionObservation {
  if (receipt.tenant_id !== context.callerTenant) return { id: receipt.trace_id, association: context, origin: 'host-internal', simulated: context.simulated ?? false, requestedRefs: context.requestedRefs ?? [], status: 'failure', failure: 'unavailable', sections: [] }
  const kept: SectionObservation[] = receipt.resolved_refs.map(section => {
    const sourceRef = section.page_slug ? pageReference(section.source_ref, section.page_slug) : section.source_ref
    const parsed = parseForgeRef(sourceRef, context.callerTenant)
    return { sourceRef, resourceKey: parsed?.resourceKey, version: section.version, pageSlug: section.page_slug ?? parsed?.pageSlug ?? null, outcome: 'included', redactionApplied: section.redaction_applied, compiledTokenCount: section.compiled_token_count, targetTokens: section.target_tokens, bodyHash: section.body_hash, redactorEngine: section.redactor_engine }
  })
  return { ...observationBase(receipt, context, 'host-internal'), sections: [...kept, ...droppedSections(receipt.sections_dropped, context)] }
}
