import type { AuthorizedNodeDetails, BrainDataSource, BrainFilters, BrainGraph, DetailsLoader, Diagnostic, ResolutionObservation, ViewState } from './types'
import { validateGraph } from './validation'

export class BrainDataError extends Error {
  readonly category: 'authorization' | 'scope' | 'unavailable'
  constructor(category: 'authorization' | 'scope' | 'unavailable') { super('Authorized data unavailable'); this.name = 'BrainDataError'; this.category = category }
}
export const defaultFilters: BrainFilters = { query: '', kinds: [], neighborhood: 0, groupId: null }
export const defaultView: ViewState = { renderer: 'auto', layout: 'brain', quality: 'high' }
export type DetailState = { readonly status: 'idle' | 'loading' | 'unavailable' } | { readonly status: 'ready'; readonly value: AuthorizedNodeDetails }
export interface BrainSnapshot {
  readonly graph: BrainGraph
  readonly selectedNodeId: string | null
  readonly selectedEdgeId: string | null
  readonly expandedGroups: readonly string[]
  readonly filters: BrainFilters
  readonly view: ViewState
  readonly tray: readonly string[]
  readonly observation: ResolutionObservation | null
  readonly details: DetailState
  readonly diagnostics: readonly Diagnostic[]
  readonly dataStatus: 'ready' | 'loading' | 'unavailable'
}
export interface BrainStoreOptions {
  selectedNodeId?: string | null
  expandedGroups?: readonly string[]
  filters?: BrainFilters
  view?: ViewState
  onSelectedNodeChange?: (id: string | null) => void
  onExpandedGroupsChange?: (ids: readonly string[]) => void
  onFiltersChange?: (filters: BrainFilters) => void
  onViewChange?: (view: ViewState) => void
  onRequestDetails?: DetailsLoader
}
export function createBrainStore(initialGraph: BrainGraph, initial: BrainStoreOptions = {}) {
  let options = initial
  const diagnostics = validateGraph(initialGraph)
  let snapshot: BrainSnapshot = {
    graph: diagnostics.length ? { ...initialGraph, nodes: [], edges: [] } : initialGraph,
    selectedNodeId: initial.selectedNodeId ?? null, selectedEdgeId: null,
    expandedGroups: initial.expandedGroups ?? [], filters: initial.filters ?? defaultFilters,
    view: initial.view ?? defaultView, tray: [], observation: null, details: { status: 'idle' },
    diagnostics, dataStatus: diagnostics.length ? 'unavailable' : 'ready',
  }
  const listeners = new Set<() => void>()
  let detailAbort: AbortController | null = null, graphAbort: AbortController | null = null
  let detailGeneration = 0, graphGeneration = 0, disposed = false
  let unsubscribe: (() => void) | undefined
  const emit = (patch: Partial<BrainSnapshot>) => { if (disposed) return; snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()) }
  const invalidateDetails = () => { detailAbort?.abort(); detailAbort = null; detailGeneration++ }
  async function requestDetails(nodeId: string) {
    invalidateDetails()
    const loader = options.onRequestDetails
    if (!loader || !snapshot.graph.nodes.some(node => node.id === nodeId)) { emit({ details: { status: 'unavailable' } }); return }
    const generation = detailGeneration, { scopeKey, revision: graphRevision } = snapshot.graph
    const controller = new AbortController(); detailAbort = controller
    emit({ details: { status: 'loading' } })
    try {
      const value = await loader({ nodeId, scopeKey, graphRevision, signal: controller.signal })
      if (disposed || controller.signal.aborted || generation !== detailGeneration || snapshot.selectedNodeId !== nodeId || snapshot.graph.scopeKey !== scopeKey || snapshot.graph.revision !== graphRevision) return
      if (value.scopeKey !== scopeKey) { failClosed(scopeKey); return }
      if (value.graphRevision !== graphRevision || value.nodeId !== nodeId) { emit({ details: { status: 'unavailable' } }); return }
      emit({ details: { status: 'ready', value } })
    } catch (error) { if (!disposed && generation === detailGeneration) { if (error instanceof BrainDataError && error.category !== 'unavailable') failClosed(scopeKey); else emit({ details: { status: 'unavailable' } }) } }
  }
  function select(nodeId: string | null, external = false) {
    if (!external && options.selectedNodeId !== undefined) { options.onSelectedNodeChange?.(nodeId); return }
    invalidateDetails()
    emit({ selectedNodeId: nodeId, selectedEdgeId: null, details: { status: 'idle' } })
    if (!external) options.onSelectedNodeChange?.(nodeId)
    if (nodeId) void requestDetails(nodeId)
  }
  function applyGraph(graph: BrainGraph) {
    const scopeChanged = graph.scopeKey !== snapshot.graph.scopeKey
    const revisionChanged = graph.revision !== snapshot.graph.revision
    const diagnostics = validateGraph(graph)
    const resetContext = scopeChanged || diagnostics.length > 0
    if (resetContext || revisionChanged) invalidateDetails()
    const safeGraph = diagnostics.length ? { ...graph, nodes: [], edges: [] } : graph
    emit({ graph: safeGraph, diagnostics, dataStatus: diagnostics.length ? 'unavailable' : 'ready',
      ...(resetContext ? { selectedNodeId: null, selectedEdgeId: null, filters: defaultFilters, tray: [], expandedGroups: [], observation: null, details: { status: 'idle' } as DetailState } : {}),
      ...(revisionChanged && !resetContext ? { details: { status: 'idle' } as DetailState, selectedEdgeId: null, tray: snapshot.tray.filter(id => safeGraph.nodes.some(node => node.id === id)) } : {}),
    })
    if (resetContext) options.onSelectedNodeChange?.(null)
    return diagnostics.length === 0
  }
  function replaceGraph(graph: BrainGraph) {
    graphAbort?.abort(); graphAbort = null; graphGeneration++
    unsubscribe?.(); unsubscribe = undefined
    applyGraph(graph)
  }
  function failClosed(scopeKey: string) {
    invalidateDetails(); graphAbort?.abort(); graphGeneration++; unsubscribe?.(); unsubscribe = undefined
    emit({ graph: { schemaVersion: '1', scopeKey, revision: 'unavailable', nodes: [], edges: [], completeness: 'partial' }, selectedNodeId: null, selectedEdgeId: null, filters: defaultFilters, expandedGroups: [], tray: [], observation: null, details: { status: 'unavailable' }, dataStatus: 'unavailable' })
    options.onSelectedNodeChange?.(null)
  }
  async function loadGraph(source: BrainDataSource, scopeKey: string, cursor?: string) {
    graphAbort?.abort(); unsubscribe?.(); unsubscribe = undefined
    const generation = ++graphGeneration, controller = new AbortController(); graphAbort = controller
    if (snapshot.graph.scopeKey !== scopeKey) {
      invalidateDetails()
      emit({ graph: { schemaVersion: '1', scopeKey, revision: 'loading', nodes: [], edges: [], completeness: 'partial' }, selectedNodeId: null, selectedEdgeId: null, filters: defaultFilters, expandedGroups: [], tray: [], observation: null, details: { status: 'idle' } })
    }
    emit({ dataStatus: 'loading' })
    try {
      const graph = await source.loadGraph({ scopeKey, cursor, signal: controller.signal })
      if (disposed || controller.signal.aborted || generation !== graphGeneration) return
      if (graph.scopeKey !== scopeKey) { failClosed(scopeKey); return }
      if (!applyGraph(graph)) return
      let sequence = -1
      const stop = source.subscribe?.({ scopeKey, onRevision(next, nextSequence) {
        if (disposed || generation !== graphGeneration || snapshot.graph.scopeKey !== scopeKey || !Number.isSafeInteger(nextSequence) || nextSequence <= sequence) return
        if (next.scopeKey !== scopeKey) { failClosed(scopeKey); return }
        sequence = nextSequence
        if (!applyGraph(next)) failClosed(scopeKey)
      } })
      if (generation === graphGeneration && !disposed) unsubscribe = stop
      else stop?.()
    } catch { if (!disposed && generation === graphGeneration) failClosed(scopeKey) }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    configure(next: BrainStoreOptions) { options = next },
    replaceGraph, select, requestDetails, loadGraph, failClosed,
    setEdge(id: string | null) { emit({ selectedEdgeId: id }) },
    setExpandedGroups(ids: readonly string[], external = false) { if (!external && options.expandedGroups !== undefined) { options.onExpandedGroupsChange?.(ids); return }; emit({ expandedGroups: [...ids] }); if (!external) options.onExpandedGroupsChange?.(ids) },
    setFilters(filters: BrainFilters, external = false) { if (!external && options.filters !== undefined) { options.onFiltersChange?.(filters); return }; invalidateDetails(); emit({ filters, details: { status: 'idle' } }); if (!external) options.onFiltersChange?.(filters) },
    setView(view: ViewState, external = false) { if (!external && options.view !== undefined) { options.onViewChange?.(view); return }; emit({ view }); if (!external) options.onViewChange?.(view) },
    setObservation(observation: ResolutionObservation | null) { emit({ observation: observation?.association.scopeKey === snapshot.graph.scopeKey ? observation : null }) },
    addToTray(id: string) { if (snapshot.graph.nodes.some(node => node.id === id && node.canonicalRef) && !snapshot.tray.includes(id)) emit({ tray: [...snapshot.tray, id] }) },
    removeFromTray(id: string) { emit({ tray: snapshot.tray.filter(nodeId => nodeId !== id) }) },
    reorderTray(id: string, offset: number) { const tray = [...snapshot.tray], index = tray.indexOf(id), target = index + offset; if (index >= 0 && target >= 0 && target < tray.length) { [tray[index], tray[target]] = [tray[target], tray[index]]; emit({ tray }) } },
    clearTray() { emit({ tray: [] }) },
    dispose() { disposed = true; invalidateDetails(); graphAbort?.abort(); unsubscribe?.(); listeners.clear() },
    resume() { disposed = false },
  }
}
export type BrainStore = ReturnType<typeof createBrainStore>
