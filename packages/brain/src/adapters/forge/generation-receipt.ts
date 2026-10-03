import type { ResolutionObservation } from '../../core/types'
import { droppedSections, observationBase } from './receipt-common'
import type { ForgeAdapterContext, ForgeContextReceiptDto } from './wire-types'
export function normalizeForgeGenerationReceipt(contextReceipt: ForgeContextReceiptDto, context: ForgeAdapterContext): ResolutionObservation {
  return { ...observationBase(contextReceipt, context, 'public-generation'), sections: droppedSections(contextReceipt.sections_dropped, context) }
}
