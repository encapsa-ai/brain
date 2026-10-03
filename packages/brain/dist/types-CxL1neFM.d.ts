type NodeId = string;
type EdgeId = string;
type JsonValue = null | boolean | number | string | readonly JsonValue[] | {
    readonly [key: string]: JsonValue;
};
type EvidenceOrigin = 'manifest' | 'body-reference' | 'receipt' | 'host-supplied' | 'derived-containment' | 'synthetic';
interface BrainNode<M extends JsonValue = JsonValue> {
    readonly id: NodeId;
    readonly kind: string;
    readonly label: string;
    readonly sourceNamespace: string;
    readonly canonicalRef?: string;
    readonly resourceKey?: string;
    readonly version?: string;
    readonly contentHash?: string;
    readonly metrics?: Readonly<Record<string, number | null>>;
    readonly metadata?: M;
}
interface BrainEdge<M extends JsonValue = JsonValue> {
    readonly id: EdgeId;
    readonly source: NodeId;
    readonly target: NodeId;
    readonly kind: string;
    readonly directed: boolean;
    readonly evidence: {
        readonly origin: EvidenceOrigin;
        readonly locator?: string;
    };
    readonly metadata?: M;
}
interface BrainGraph {
    readonly schemaVersion: '1';
    readonly scopeKey: string;
    readonly revision: string;
    readonly nodes: readonly BrainNode[];
    readonly edges: readonly BrainEdge[];
    readonly completeness: 'complete' | 'partial';
    readonly nextCursor?: string;
}
interface AuthorizedNodeDetails {
    readonly scopeKey: string;
    readonly graphRevision: string;
    readonly nodeId: string;
    readonly fields: readonly {
        readonly label: string;
        readonly value: string | number | boolean | null;
    }[];
    readonly authorizedText?: string;
    readonly evidence?: readonly {
        readonly label: string;
        readonly locator?: string;
    }[];
}
interface BrainDataSource {
    loadGraph(input: {
        scopeKey: string;
        cursor?: string;
        signal: AbortSignal;
    }): Promise<BrainGraph>;
    loadDetails?(input: {
        scopeKey: string;
        nodeId: string;
        graphRevision: string;
        signal: AbortSignal;
    }): Promise<AuthorizedNodeDetails>;
    subscribe?(input: {
        scopeKey: string;
        onRevision: (graph: BrainGraph, sequence: number) => void;
    }): () => void;
}
type DetailsLoader = NonNullable<BrainDataSource['loadDetails']>;
interface TierDefinition {
    readonly id: string;
    readonly label: string;
    readonly order: number;
    readonly minVisibilityLevel?: number;
    readonly groupBy: (node: BrainNode) => {
        key: string;
        label: string;
    } | null;
}
interface PresentationGroup {
    readonly id: string;
    readonly tierId: string;
    readonly label: string;
    readonly parentGroupId?: string;
    readonly totalCount?: number;
}
interface PresentationMembership {
    readonly nodeId: string;
    readonly groupId: string;
    readonly aliasId?: string;
}
interface BrainHierarchy {
    readonly groups: readonly PresentationGroup[];
    readonly memberships: readonly PresentationMembership[];
}
type NodeShape = 'circle' | 'square' | 'diamond' | 'hexagon';
interface KindStyle {
    readonly label: string;
    readonly color: string;
    readonly shape: NodeShape;
    readonly glyph?: string;
}
interface EdgeKindStyle {
    readonly label: string;
    readonly color: string;
    readonly dashed?: boolean;
}
interface BrainPreset {
    readonly id: string;
    readonly nodeKinds?: Readonly<Record<string, KindStyle>>;
    readonly edgeKinds?: Readonly<Record<string, EdgeKindStyle>>;
    readonly tiers?: readonly TierDefinition[];
    readonly hierarchy?: BrainHierarchy | ((graph: BrainGraph) => BrainHierarchy);
}
interface PresentationNode extends BrainNode {
    readonly canonicalId?: string;
    readonly groupId?: string;
    readonly memberIds?: readonly string[];
    readonly loadedCount?: number;
    readonly totalCount?: number;
}
interface PresentationEdge extends BrainEdge {
    readonly count?: number;
    readonly originalEdgeIds?: readonly string[];
}
interface GraphProjection {
    readonly nodes: readonly PresentationNode[];
    readonly edges: readonly PresentationEdge[];
    readonly canonicalToVisible: ReadonlyMap<string, string>;
    readonly hiddenNodeCount: number;
}
type RendererKind = 'auto' | 'webgl' | 'svg' | 'list';
type LayoutKind = 'brain' | 'cluster';
interface ViewState {
    readonly renderer: RendererKind;
    readonly layout: LayoutKind;
    readonly quality: 'high' | 'low';
}
interface BrainFilters {
    readonly query: string;
    readonly kinds: readonly string[];
    readonly neighborhood: 0 | 1 | 2;
    readonly groupId: string | null;
}
interface NodeSizeOptions {
    readonly metric: string;
    readonly scale: 'sqrt' | 'linear';
    readonly min: number;
    readonly max: number;
    readonly unknown?: number;
}
interface SectionObservation {
    readonly sourceRef: string;
    readonly resourceKey?: string;
    readonly version: string | null;
    readonly pageSlug: string | null;
    readonly outcome: 'requested' | 'resolved' | 'included' | 'dropped';
    readonly redactionApplied: boolean | null;
    readonly compiledTokenCount: number | null;
    readonly targetTokens: number | null;
    readonly priority?: number;
    readonly bodyHash?: string;
    readonly redactorEngine?: string;
}
interface ObservationAssociation {
    readonly scopeKey: string;
    readonly graphRevision: string;
    readonly sourceNamespace: string;
    readonly callerTenant: string;
}
type ResolutionObservation = {
    readonly id: string;
    readonly association: ObservationAssociation;
    readonly origin: 'public-resolve' | 'public-generation' | 'host-internal' | 'synthetic';
    readonly simulated: boolean;
    readonly requestedRefs: readonly string[];
} & ({
    readonly status: 'success';
    readonly sections: readonly SectionObservation[];
    readonly receipt: {
        readonly traceId: string;
        readonly targetModelAlias: string;
        readonly compiledTokenCount: number | null;
        readonly tokenBudgetCheckDeferred: boolean;
        readonly compilationHash: string;
        readonly compiledAt: string;
        readonly contextParamsDigest?: string;
    };
} | {
    readonly status: 'failure';
    readonly failure: 'policy-denied' | 'cycle-or-depth' | 'unavailable';
    readonly sections: readonly [];
    readonly receipt?: never;
});
type ObservationMatch = {
    readonly section: SectionObservation;
    readonly nodeId: string | null;
    readonly reason: 'matched' | 'scope-mismatch' | 'snapshot-mismatch' | 'unknown-version' | 'not-in-projection';
};
type Diagnostic = {
    readonly code: 'duplicate-node' | 'duplicate-edge' | 'dangling-edge' | 'invalid-node' | 'invalid-graph' | 'containment-cycle' | 'invalid-membership';
    readonly severity: 'error' | 'warning';
    readonly count: number;
};
type DiagnosticEvent = {
    readonly category: 'renderer-selected' | 'renderer-fallback' | 'layout' | 'frame-sample' | 'data-unavailable';
    readonly durationMs?: number;
    readonly nodeCount?: number;
    readonly edgeCount?: number;
    readonly value?: number;
};
type DiagnosticListener = (event: DiagnosticEvent) => void;
interface GraphIndex {
    readonly nodes: ReadonlyMap<string, BrainNode>;
    readonly incoming: ReadonlyMap<string, readonly BrainEdge[]>;
    readonly outgoing: ReadonlyMap<string, readonly BrainEdge[]>;
}
type Position3 = readonly [number, number, number];
interface LayoutResult {
    readonly positions: Readonly<Record<string, Position3>>;
    readonly bounds: {
        readonly min: Position3;
        readonly max: Position3;
    };
    readonly scopeKey: string;
    readonly revision: string;
}
interface LayoutInput {
    readonly graph: Pick<BrainGraph, 'scopeKey' | 'revision'> & {
        readonly nodes: readonly BrainNode[];
        readonly edges: readonly BrainEdge[];
    };
    readonly seed: string;
    readonly dimensions: 2 | 3;
    readonly previous?: Readonly<Record<string, Position3>>;
    readonly signal?: AbortSignal;
}
type LayoutAdapter = (input: LayoutInput) => LayoutResult | Promise<LayoutResult>;
interface CameraState {
    readonly yaw: number;
    readonly pitch: number;
    readonly distance: number;
    readonly target: Position3;
    readonly pan: readonly [number, number];
    readonly zoom: number;
}
type CameraCommand = {
    readonly type: 'rotate';
    readonly yaw: number;
    readonly pitch: number;
} | {
    readonly type: 'zoom';
    readonly factor: number;
} | {
    readonly type: 'fit' | 'reset';
} | {
    readonly type: 'focus';
    readonly nodeIds: readonly string[];
};
interface BrainController {
    focusNode(id: string): void;
    fit(): void;
    resetCamera(): void;
    rotate(yaw: number, pitch: number): void;
}

export type { AuthorizedNodeDetails as A, BrainGraph as B, CameraState as C, Diagnostic as D, EvidenceOrigin as E, GraphIndex as G, JsonValue as J, KindStyle as K, LayoutResult as L, NodeSizeOptions as N, ObservationAssociation as O, Position3 as P, ResolutionObservation as R, SectionObservation as S, TierDefinition as T, ViewState as V, BrainPreset as a, BrainHierarchy as b, BrainEdge as c, BrainNode as d, EdgeKindStyle as e, BrainFilters as f, GraphProjection as g, ObservationMatch as h, DetailsLoader as i, BrainDataSource as j, CameraCommand as k, LayoutInput as l, LayoutKind as m, LayoutAdapter as n, BrainController as o, DiagnosticEvent as p, DiagnosticListener as q, EdgeId as r, NodeId as s, NodeShape as t, PresentationEdge as u, PresentationGroup as v, PresentationMembership as w, PresentationNode as x, RendererKind as y };
