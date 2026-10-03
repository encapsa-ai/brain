import { O as ObservationAssociation, J as JsonValue, E as EvidenceOrigin, B as BrainGraph, R as ResolutionObservation, a as BrainPreset } from '../../types-CxL1neFM.js';

interface ForgePackSummary {
    readonly pack_ref: string;
    readonly current_version: string;
    readonly contains_phi: boolean;
    readonly provenance: string;
    readonly page_count: number;
    readonly updated_at: string;
}
interface ForgeSkillSummary {
    readonly skill_ref: string;
    readonly scope: string;
    readonly current_version: string;
    readonly updated_at: string;
}
interface ForgePackList {
    readonly packs: readonly ForgePackSummary[];
    readonly next_cursor: string | null;
}
interface ForgeSkillList {
    readonly skills: readonly ForgeSkillSummary[];
    readonly next_cursor: string | null;
}
interface ForgePackPageEntry {
    readonly slug: string;
    readonly title: string;
    readonly blake3: string;
    readonly size_bytes: number;
    readonly contains_phi: boolean;
    readonly provenance: string;
    readonly budget: JsonValue;
    readonly activation_tags?: readonly string[];
    readonly content_type: string;
}
interface ForgeDroppedSection {
    readonly source_ref: string;
    readonly version: string;
    readonly page_slug?: string;
    readonly priority: number;
    readonly target_tokens: number;
}
interface ForgeResolutionReceiptDto {
    readonly trace_id: string;
    readonly target_model_alias: string;
    readonly compiled_token_count: number | null;
    readonly token_budget_check_deferred: boolean;
    readonly sections_dropped: readonly ForgeDroppedSection[];
    readonly compilation_hash: string;
    readonly compiled_at: string;
}
interface ForgeResolvedReferenceDto {
    readonly ref: string;
    readonly resolved_pages?: readonly string[];
    readonly manifest_etag: string;
}
interface ForgeResolveResponseDto {
    readonly resolved_refs: readonly ForgeResolvedReferenceDto[];
    readonly compiled_prompt: unknown;
    readonly receipt: ForgeResolutionReceiptDto;
}
interface ForgeContextReceiptDto extends ForgeResolutionReceiptDto {
    readonly context_params_digest?: string;
}
interface ForgeResolvedSourceReceipt {
    readonly source_ref: string;
    readonly kind: string;
    readonly version: string;
    readonly page_slug?: string;
    readonly body_hash: string;
    readonly target_tokens: number;
    readonly compiled_token_count: number | null;
    readonly redaction_applied: boolean;
    readonly redactor_engine: string;
}
interface ForgeInternalReceipt extends ForgeContextReceiptDto {
    readonly tenant_id: string;
    readonly resolved_refs: readonly ForgeResolvedSourceReceipt[];
    readonly redaction_applied: boolean;
    readonly redactor_engines: readonly string[];
    readonly total_target_tokens: number;
}
interface ForgeAdapterContext extends ObservationAssociation {
    readonly simulated?: boolean;
    readonly requestedRefs?: readonly string[];
}
/** Explicit allowlisted host projection, not a Forge wire payload. TokenBudget's wire shape is intentionally opaque. */
interface HostPackProjection {
    readonly packRef: string;
    readonly label: string;
    readonly version: string;
    readonly subject: {
        readonly kind: string;
        readonly id: string;
        readonly label: string;
    };
    readonly targetTokens?: number;
    readonly pages: readonly {
        readonly entry: ForgePackPageEntry;
        readonly targetTokens?: number;
    }[];
    readonly sharedReadOnly?: boolean;
    readonly evidenceLocator?: string;
}
/** Declarations supplied by an authorizing host; never observations of execution. */
interface HostSkillProjection {
    readonly skillRef: string;
    readonly label: string;
    readonly version: string;
    readonly scope: string;
    readonly description?: string;
    readonly targetTokens?: number;
    readonly activationPackRefs?: readonly string[];
}
interface HostRelationship {
    readonly sourceRef: string;
    readonly targetRef: string;
    readonly kind: string;
    readonly directed: boolean;
    readonly origin: EvidenceOrigin;
    readonly locator?: string;
    readonly explanation: string;
}

interface ForgeCatalogInput {
    readonly context: ForgeAdapterContext;
    readonly packs?: ForgePackList;
    readonly skills?: ForgeSkillList;
    readonly manifests?: readonly HostPackProjection[];
    readonly skillMetadata?: readonly HostSkillProjection[];
    readonly relationships?: readonly HostRelationship[];
    readonly completeness?: 'complete' | 'partial';
}
declare function pageReference(ref: string, pageSlug: string): string;
declare function normalizeForgeCatalog(input: ForgeCatalogInput): BrainGraph;

declare function normalizeForgeResolveResponse(response: ForgeResolveResponseDto, context: ForgeAdapterContext): ResolutionObservation;

declare function normalizeForgeGenerationReceipt(contextReceipt: ForgeContextReceiptDto, context: ForgeAdapterContext): ResolutionObservation;

declare function normalizeForgeInternalReceipt(receipt: ForgeInternalReceipt, context: ForgeAdapterContext): ResolutionObservation;

declare const forgePreset: BrainPreset;

export { type ForgeAdapterContext, type ForgeCatalogInput, type ForgeContextReceiptDto, type ForgeDroppedSection, type ForgeInternalReceipt, type ForgePackList, type ForgePackPageEntry, type ForgePackSummary, type ForgeResolutionReceiptDto, type ForgeResolveResponseDto, type ForgeResolvedReferenceDto, type ForgeResolvedSourceReceipt, type ForgeSkillList, type ForgeSkillSummary, type HostPackProjection, type HostRelationship, type HostSkillProjection, forgePreset, normalizeForgeCatalog, normalizeForgeGenerationReceipt, normalizeForgeInternalReceipt, normalizeForgeResolveResponse, pageReference };
