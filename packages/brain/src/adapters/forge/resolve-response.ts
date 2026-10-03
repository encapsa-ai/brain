import type { ResolutionObservation, SectionObservation } from '../../core/types'
import { parseForgeRef } from '../../core/identity'
import { pageReference } from './catalog'
import { droppedSections, observationBase } from './receipt-common'
import type { ForgeAdapterContext, ForgeResolveResponseDto } from './wire-types'
export function normalizeForgeResolveResponse(response: ForgeResolveResponseDto, context: ForgeAdapterContext): ResolutionObservation {
  const sections: SectionObservation[] = []
  for (const resolved of response.resolved_refs) {
    const refs = [resolved.ref, ...(resolved.resolved_pages ?? []).map(slug => pageReference(resolved.ref, slug))]
    for (const sourceRef of [...new Set(refs)]) {
      const parsed = parseForgeRef(sourceRef, context.callerTenant)
      sections.push({ sourceRef, resourceKey: parsed?.resourceKey, version: parsed?.version ?? null, pageSlug: parsed?.pageSlug ?? null, outcome: 'resolved', redactionApplied: null, compiledTokenCount: null, targetTokens: null })
    }
  }
  return { ...observationBase(response.receipt, context, 'public-resolve'), sections: [...sections, ...droppedSections(response.receipt.sections_dropped, context)] }
}
