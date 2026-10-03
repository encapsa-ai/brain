import { V as ViewportRendererProps } from '../renderer-types-jvhXy3Xl.js';
import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import { ReactNode, ComponentType, CSSProperties, Ref, RefObject } from 'react';

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
        readonly copyable?: boolean;
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

type WebGLRendererLoader = () => Promise<{
    BrainWebGLRenderer: ComponentType<ViewportRendererProps>;
}>;
interface BrainProviderProps extends BrainStoreOptions {
    graph: BrainGraph;
    preset?: BrainPreset;
    children: ReactNode;
    defaultSelectedNodeId?: string | null;
    defaultExpandedGroups?: readonly string[];
    defaultView?: BrainStoreOptions['view'];
    motion?: 'system' | 'reduced' | 'full';
    autoFocus?: boolean;
    nodeSize?: NodeSizeOptions;
    layoutSeed?: string;
    loadWebGLRenderer?: WebGLRendererLoader;
    layoutAdapter?: LayoutAdapter;
    layoutWorkerFactory?: () => LayoutWorkerPort;
    onDiagnostic?: DiagnosticListener;
    nodeStyleResolver?: (node: BrainNode, defaults: KindStyle) => KindStyle;
    edgeStyleResolver?: (edge: BrainEdge, defaults: EdgeKindStyle) => EdgeKindStyle;
    /** Continuous by default in every renderer; opt into preset dash patterns. */
    edgePattern?: 'continuous' | 'declared';
}
interface ContextValue {
    store: BrainStore;
    camera: CameraBus;
    preset?: BrainPreset;
    motion: 'system' | 'reduced' | 'full';
    autoFocus: boolean;
    nodeSize: NodeSizeOptions;
    layoutSeed: string;
    loadWebGLRenderer?: WebGLRendererLoader;
    layoutAdapter?: LayoutAdapter;
    layoutWorkerFactory?: () => LayoutWorkerPort;
    onDiagnostic?: DiagnosticListener;
    nodeStyleResolver?: BrainProviderProps['nodeStyleResolver'];
    edgeStyleResolver?: BrainProviderProps['edgeStyleResolver'];
    edgePattern: 'continuous' | 'declared';
}
declare function BrainProvider(props: BrainProviderProps): react_jsx_runtime.JSX.Element;
declare function useBrainContext(): ContextValue;
declare function useBrain(): {
    index: GraphIndex;
    hierarchy: BrainHierarchy;
    hierarchyErrors: readonly Diagnostic[];
    projection: GraphProjection;
    select: (id: string | null) => void;
    selectEdge: (edge: BrainEdge) => void;
    nodeStyle: (node: BrainNode) => KindStyle;
    edgeStyle: (edge: BrainEdge) => EdgeKindStyle;
    graph: BrainGraph;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    expandedGroups: readonly string[];
    filters: BrainFilters;
    view: ViewState;
    tray: readonly string[];
    observation: ResolutionObservation | null;
    details: DetailState;
    diagnostics: readonly Diagnostic[];
    dataStatus: "ready" | "loading" | "unavailable";
    store: BrainStore;
    camera: CameraBus;
    preset?: BrainPreset;
    motion: "system" | "reduced" | "full";
    autoFocus: boolean;
    nodeSize: NodeSizeOptions;
    layoutSeed: string;
    loadWebGLRenderer?: WebGLRendererLoader;
    layoutAdapter?: LayoutAdapter;
    layoutWorkerFactory?: () => LayoutWorkerPort;
    onDiagnostic?: DiagnosticListener;
    nodeStyleResolver?: BrainProviderProps["nodeStyleResolver"];
    edgeStyleResolver?: BrainProviderProps["edgeStyleResolver"];
    edgePattern: "continuous" | "declared";
};
declare function useBrainLayout(dimensions?: 2 | 3): LayoutResult;
declare function useReducedMotion(): boolean;

interface BrainViewportProps {
    renderer?: RendererKind;
    layout?: LayoutKind;
    forceWebGLFailure?: boolean;
    renderExtraWebGL?: () => ReactNode;
    loadingSlot?: ReactNode;
    emptySlot?: ReactNode;
    errorSlot?: ReactNode;
    unsupportedSlot?: ReactNode;
    interactive?: boolean;
    showLabels?: boolean;
}
declare function BrainViewport({ renderer, layout, forceWebGLFailure, renderExtraWebGL, loadingSlot, emptySlot, errorSlot, unsupportedSlot, interactive, showLabels }: BrainViewportProps): react_jsx_runtime.JSX.Element;

interface BrainInspectorOptions {
    showUnknownVersion?: boolean;
    showCompleteness?: boolean;
    showMetadataFooter?: boolean;
    /** Retained, but opt-in until the host supplies a useful directed graph. */
    showDirectedPaths?: boolean;
    labels?: Partial<{
        source: string;
        sourceEvidence: string;
        version: string;
        unknownVersion: string;
        completeness: string;
        metadataFooter: string;
    }>;
}
interface BrainInspectorProps {
    renderNodeDetails?: (node: BrainNode) => ReactNode;
    renderNodeActions?: (node: BrainNode) => ReactNode;
    onClose?: () => void;
    showContextActions?: boolean;
    inspectorOptions?: BrainInspectorOptions;
}
declare function BrainInspector({ renderNodeDetails, renderNodeActions, onClose, showContextActions, inspectorOptions }: BrainInspectorProps): react_jsx_runtime.JSX.Element | null;

interface BrainContextTrayProps {
    onPreview?: (refs: readonly string[]) => void | Promise<void>;
    previewLabel?: string;
    simulated?: boolean;
}
declare function BrainContextTray({ onPreview, previewLabel, simulated }: BrainContextTrayProps): react_jsx_runtime.JSX.Element;

type ExplorerMode = 'inventory' | 'composition' | 'receipt' | 'illustrative';
declare function BrainResolutionPanel({ illustrative, controls }: {
    illustrative?: boolean;
    controls?: ReactNode;
}): react_jsx_runtime.JSX.Element | null;

interface BrainExplorerShellProps extends BrainViewportProps, BrainInspectorProps, BrainContextTrayProps {
    className?: string;
    style?: CSSProperties;
    theme?: 'dark' | 'light';
    toolbarStart?: ReactNode;
    toolbarEnd?: ReactNode;
    children?: ReactNode;
    mode?: ExplorerMode;
    onModeChange?: (mode: ExplorerMode) => void;
    receiptControls?: ReactNode;
    controllerRef?: Ref<BrainController>;
    defaultNavigatorOpen?: boolean;
    /** Fill the host panel; do not collapse to a miniature when used in a tab. */
    variant?: 'standalone' | 'embedded';
    showContextTray?: boolean;
}
interface BrainExplorerProps extends Omit<BrainProviderProps, 'children'>, BrainExplorerShellProps {
}
declare const BrainExplorer: react.ForwardRefExoticComponent<BrainExplorerProps & react.RefAttributes<BrainController>>;
declare function BrainExplorerShell(props: BrainExplorerShellProps): react_jsx_runtime.JSX.Element;

interface BrainPreviewProps extends Omit<BrainProviderProps, 'children'> {
    /** The host owns expansion: select a tab, open a panel, or navigate. */
    onExpand: () => void;
    expandLabel?: string;
    label?: string;
    className?: string;
    style?: CSSProperties;
    theme?: 'dark' | 'light';
    renderer?: Exclude<RendererKind, 'list'>;
    layout?: LayoutKind;
}
/**
 * A read-only overview with exactly one action. It does not request fullscreen
 * or take ownership of host navigation. SVG is the inexpensive default.
 */
declare function BrainPreview({ onExpand, expandLabel, label, className, style, theme, renderer, layout, ...providerProps }: BrainPreviewProps): react_jsx_runtime.JSX.Element;

declare function useExplorerFullscreen(ref: RefObject<HTMLElement | null>): {
    mode: "none" | "native" | "overlay";
    enter: (overlayOnly?: boolean) => Promise<void>;
    exit: () => Promise<void>;
};

declare function BrainToolbar(): react_jsx_runtime.JSX.Element;

declare function BrainKindFilters({ label, kindLabels }: {
    label?: string;
    kindLabels?: Readonly<Record<string, string>>;
}): react_jsx_runtime.JSX.Element;
declare function BrainTierNavigator({ onClose }: {
    onClose?: () => void;
}): react_jsx_runtime.JSX.Element;

interface BrainPickerOption<T extends string = string> {
    value: T;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
}
declare function BrainPicker<T extends string>({ label, value, options, onChange }: {
    label: string;
    value: T;
    options: readonly BrainPickerOption<T>[];
    onChange: (value: T) => void;
}): react_jsx_runtime.JSX.Element;
declare function BrainConnectionPicker({ label, labels }: {
    label?: string;
    labels?: readonly [string, string, string];
}): react_jsx_runtime.JSX.Element;
declare function BrainCopyField({ value, label }: {
    value: string;
    label?: string;
}): react_jsx_runtime.JSX.Element;

declare function BrainLegend(): react_jsx_runtime.JSX.Element;

declare function BrainAccessibleList({ className, showSearch }: {
    className?: string;
    showSearch?: boolean;
}): react_jsx_runtime.JSX.Element;

declare function BrainSvgRenderer({ width, height, active, interactive, showLabels }: ViewportRendererProps): react_jsx_runtime.JSX.Element;

export { type AuthorizedNodeDetails as A, type BrainController as B, BrainAccessibleList, BrainConnectionPicker, BrainContextTray, type BrainContextTrayProps, BrainCopyField, BrainExplorer, type BrainExplorerProps, BrainExplorerShell, type BrainExplorerShellProps, BrainInspector, type BrainInspectorOptions, type BrainInspectorProps, BrainKindFilters, BrainLegend, BrainPicker, type BrainPickerOption, BrainPreview, type BrainPreviewProps, BrainProvider, type BrainProviderProps, BrainResolutionPanel, BrainSvgRenderer, BrainTierNavigator, BrainToolbar, BrainViewport, type BrainViewportProps, type CameraCommand as C, type DetailsLoader as D, type EdgeId as E, type ExplorerMode, type GraphIndex as G, type JsonValue as J, type KindStyle as K, type LayoutAdapter as L, type NodeId as N, type ObservationAssociation as O, type Position3 as P, type RendererKind as R, type SectionObservation as S, type TierDefinition as T, type ViewState as V, ViewportRendererProps, type WebGLRendererLoader, type BrainDataSource as a, type BrainEdge as b, type BrainFilters as c, type BrainGraph as d, type BrainHierarchy as e, type BrainNode as f, type BrainPreset as g, type CameraState as h, type Diagnostic as i, type DiagnosticEvent as j, type DiagnosticListener as k, type EdgeKindStyle as l, type EvidenceOrigin as m, type GraphProjection as n, type LayoutInput as o, type LayoutKind as p, type LayoutResult as q, type NodeShape as r, type NodeSizeOptions as s, type ObservationMatch as t, type PresentationEdge as u, useBrain, useBrainContext, useBrainLayout, useExplorerFullscreen, useReducedMotion, type PresentationGroup as v, type PresentationMembership as w, type PresentationNode as x, type ResolutionObservation as y };
