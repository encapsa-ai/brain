import { B as BrainGraph, D as Diagnostic, b as BrainHierarchy, G as GraphIndex, c as BrainEdge, T as TierDefinition, K as KindStyle, a as BrainPreset, d as BrainNode, e as EdgeKindStyle, f as BrainFilters, g as GraphProjection, R as ResolutionObservation, h as ObservationMatch, V as ViewState, A as AuthorizedNodeDetails, i as DetailsLoader, j as BrainDataSource, C as CameraState, k as CameraCommand, N as NodeSizeOptions, P as Position3, L as LayoutResult, l as LayoutInput, m as LayoutKind, n as LayoutAdapter } from '../types-CxL1neFM.js';
export { o as BrainController, p as DiagnosticEvent, q as DiagnosticListener, r as EdgeId, E as EvidenceOrigin, J as JsonValue, s as NodeId, t as NodeShape, O as ObservationAssociation, u as PresentationEdge, v as PresentationGroup, w as PresentationMembership, x as PresentationNode, y as RendererKind, S as SectionObservation } from '../types-CxL1neFM.js';

declare function namespacedId(scopeKey: string, sourceNamespace: string, resourceKey: string): string;
declare function snapshotId(resourceId: string, version: string): string;
interface ForgeReference {
    readonly kind: 'pack' | 'skill';
    readonly owner: string;
    readonly subjectKind: string;
    readonly subjectId: string;
    readonly name: string;
    readonly version: string | null;
    readonly pageSlug: string | null;
    readonly resourceKey: string;
}
declare function parseForgeRef(reference: string, callerTenant: string): ForgeReference | null;
declare function forgeNodeId(reference: string, context: {
    scopeKey: string;
    sourceNamespace: string;
    callerTenant: string;
}): string | null;
declare function safeHref(value: string): string | null;
declare function stableHash(input: string): number;

declare function hasDirectedCycle(pairs: readonly (readonly [string, string])[]): boolean;
declare function validateGraph(graph: BrainGraph): readonly Diagnostic[];
declare function validateHierarchy(graph: BrainGraph, hierarchy: BrainHierarchy): readonly Diagnostic[];

declare function createGraphIndex(graph: BrainGraph): GraphIndex;
declare function neighborhood(index: GraphIndex, id: string, hops: 1 | 2): ReadonlySet<string>;
declare function findDirectedPath(index: GraphIndex, from: string, to: string): readonly BrainEdge[] | null;
declare function loadedDegree(index: GraphIndex, id: string): number;

declare const emptyHierarchy: BrainHierarchy;
declare function buildHierarchy(graph: BrainGraph, tiers: readonly TierDefinition[], visibilityLevel?: number): BrainHierarchy;
declare function getHierarchy(graph: BrainGraph, preset?: BrainPreset): BrainHierarchy;
declare function groupAncestors(hierarchy: BrainHierarchy, groupId: string): readonly string[];
declare function groupMembers(hierarchy: BrainHierarchy, groupId: string): ReadonlySet<string>;
declare function metadataString(node: BrainNode, key: string): string | undefined;
declare const defaultNodeKinds: Readonly<Record<string, KindStyle>>;
declare const flatPreset: BrainPreset;
declare function resolveNodeStyle(kind: string, preset?: BrainPreset): KindStyle;
declare function resolveEdgeStyle(kind: string, preset?: BrainPreset): EdgeKindStyle;

declare function projectGraph(graph: BrainGraph, hierarchy: BrainHierarchy, expandedGroups: readonly string[], filters: BrainFilters, selectedId?: string | null): GraphProjection;
declare function composeGraphs(scopeKey: string, revision: string, graphs: readonly BrainGraph[], crossSourceEdges?: BrainGraph['edges']): BrainGraph;

declare function matchObservation(graph: BrainGraph, observation: ResolutionObservation): readonly ObservationMatch[];
declare function createFailureObservation(input: Pick<ResolutionObservation, 'id' | 'association' | 'requestedRefs' | 'simulated'> & {
    failure: 'policy-denied' | 'cycle-or-depth' | 'unavailable';
}): ResolutionObservation;
declare const illustrativeStages: readonly [{
    readonly label: "Parse";
    readonly description: "Interpret caller-supplied references. This does not authorize them.";
}, {
    readonly label: "Policy / access";
    readonly description: "The host enforces caller policy and access boundaries.";
}, {
    readonly label: "Reference expansion";
    readonly description: "Resolve explicit references with bounded depth and cycle checks.";
}, {
    readonly label: "Policy checks";
    readonly description: "Policy checks can recur during reference expansion; this is a conceptual grouping.";
}, {
    readonly label: "Redaction";
    readonly description: "Where policy requires redaction, failure is fail-closed. A PHI flag alone does not establish redaction.";
}, {
    readonly label: "Compilation / budget";
    readonly description: "Deterministic ordering and whole-section budget drops, not guessed per-node token counts.";
}, {
    readonly label: "Receipt";
    readonly description: "Public receipts expose a subset of the internal compiler receipt. Missing evidence remains unknown.";
}];

declare class BrainDataError extends Error {
    readonly category: 'authorization' | 'scope' | 'unavailable';
    constructor(category: 'authorization' | 'scope' | 'unavailable');
}
declare const defaultFilters: BrainFilters;
declare const defaultView: ViewState;
type DetailState = {
    readonly status: 'idle' | 'loading' | 'unavailable';
} | {
    readonly status: 'ready';
    readonly value: AuthorizedNodeDetails;
};
interface BrainSnapshot {
    readonly graph: BrainGraph;
    readonly selectedNodeId: string | null;
    readonly selectedEdgeId: string | null;
    readonly expandedGroups: readonly string[];
    readonly filters: BrainFilters;
    readonly view: ViewState;
    readonly tray: readonly string[];
    readonly observation: ResolutionObservation | null;
    readonly details: DetailState;
    readonly diagnostics: readonly Diagnostic[];
    readonly dataStatus: 'ready' | 'loading' | 'unavailable';
}
interface BrainStoreOptions {
    selectedNodeId?: string | null;
    expandedGroups?: readonly string[];
    filters?: BrainFilters;
    view?: ViewState;
    onSelectedNodeChange?: (id: string | null) => void;
    onExpandedGroupsChange?: (ids: readonly string[]) => void;
    onFiltersChange?: (filters: BrainFilters) => void;
    onViewChange?: (view: ViewState) => void;
    onRequestDetails?: DetailsLoader;
}
declare function createBrainStore(initialGraph: BrainGraph, initial?: BrainStoreOptions): {
    getSnapshot: () => BrainSnapshot;
    subscribe(listener: () => void): () => void;
    configure(next: BrainStoreOptions): void;
    replaceGraph: (graph: BrainGraph) => void;
    select: (nodeId: string | null, external?: boolean) => void;
    requestDetails: (nodeId: string) => Promise<void>;
    loadGraph: (source: BrainDataSource, scopeKey: string, cursor?: string) => Promise<void>;
    failClosed: (scopeKey: string) => void;
    setEdge(id: string | null): void;
    setExpandedGroups(ids: readonly string[], external?: boolean): void;
    setFilters(filters: BrainFilters, external?: boolean): void;
    setView(view: ViewState, external?: boolean): void;
    setObservation(observation: ResolutionObservation | null): void;
    addToTray(id: string): void;
    removeFromTray(id: string): void;
    reorderTray(id: string, offset: number): void;
    clearTray(): void;
    dispose(): void;
    resume(): void;
};
type BrainStore = ReturnType<typeof createBrainStore>;

declare const homeCamera: CameraState;
declare const clamp: (value: number, min: number, max: number) => number;
declare function createCameraBus(): {
    state: CameraState;
    readonly autoRotate: boolean;
    getSnapshot: () => string;
    subscribe(listener: () => void): () => void;
    onCommand(listener: (command: CameraCommand) => void): () => void;
    send(command: CameraCommand): void;
    setAutoRotate(value: boolean): void;
    pause(): void;
};
type CameraBus = ReturnType<typeof createCameraBus>;
interface FrameWindow {
    readonly p50Ms: number;
    readonly p95Ms: number;
    readonly slowWindows: number;
}
declare function createFrameMonitor(): (time: number, moving: boolean) => FrameWindow | null;
declare function nodeRadius(node: BrainNode, options: NodeSizeOptions, degree?: number): number;

declare function regionIndex(node: BrainNode): number;
declare function brainSurface(u: number, v: number, hemisphere: -1 | 1): Position3;
declare function boundsFor(positions: Readonly<Record<string, Position3>>): LayoutResult['bounds'];
declare function brainLayout(input: LayoutInput): LayoutResult;

declare function clusterLayout(input: LayoutInput): LayoutResult;

interface LayoutWorkerRequest {
    readonly protocol: 1;
    readonly requestId: number;
    readonly kind: LayoutKind;
    readonly input: Omit<LayoutInput, 'signal'>;
}
interface LayoutWorkerResponse {
    readonly protocol: 1;
    readonly requestId: number;
    readonly result: LayoutResult;
}
interface LayoutWorkerPort {
    postMessage(message: LayoutWorkerRequest): void;
    terminate(): void;
    onmessage: ((event: {
        data: LayoutWorkerResponse;
    }) => void) | null;
    onerror: (() => void) | null;
}
declare function createLayoutController(options?: {
    workerFactory?: () => LayoutWorkerPort;
    timeoutMs?: number;
    onFallback?: () => void;
}): {
    run(input: LayoutInput, kind: LayoutKind, custom?: LayoutAdapter): Promise<LayoutResult | null>;
    cancel(): void;
};

export { AuthorizedNodeDetails, BrainDataError, BrainDataSource, BrainEdge, BrainFilters, BrainGraph, BrainHierarchy, BrainNode, BrainPreset, type BrainSnapshot, type BrainStore, type BrainStoreOptions, type CameraBus, CameraCommand, CameraState, type DetailState, DetailsLoader, Diagnostic, EdgeKindStyle, type ForgeReference, type FrameWindow, GraphIndex, GraphProjection, KindStyle, LayoutAdapter, LayoutInput, LayoutKind, LayoutResult, type LayoutWorkerPort, type LayoutWorkerRequest, type LayoutWorkerResponse, NodeSizeOptions, ObservationMatch, Position3, ResolutionObservation, TierDefinition, ViewState, boundsFor, brainLayout, brainSurface, buildHierarchy, clamp, clusterLayout, composeGraphs, createBrainStore, createCameraBus, createFailureObservation, createFrameMonitor, createGraphIndex, createLayoutController, defaultFilters, defaultNodeKinds, defaultView, emptyHierarchy, findDirectedPath, flatPreset, forgeNodeId, getHierarchy, groupAncestors, groupMembers, hasDirectedCycle, homeCamera, illustrativeStages, loadedDegree, matchObservation, metadataString, namespacedId, neighborhood, nodeRadius, parseForgeRef, projectGraph, regionIndex, resolveEdgeStyle, resolveNodeStyle, safeHref, snapshotId, stableHash, validateGraph, validateHierarchy };
