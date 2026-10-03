'use client'
import { createContext, useContext, useEffect, useLayoutEffect as useReactLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type ComponentType } from 'react'
import { createBrainStore, type BrainStore, type BrainStoreOptions } from '../core/store'
import { createCameraBus, type CameraBus } from '../core/camera'
import { createGraphIndex } from '../core/graph-index'
import { getHierarchy, resolveNodeStyle, resolveEdgeStyle } from '../core/hierarchy'
import { projectGraph } from '../core/projection'
import { validateHierarchy } from '../core/validation'
import { brainLayout } from '../layout/brain-layout'
import { clusterLayout } from '../layout/cluster-layout'
import { createLayoutController, type LayoutWorkerPort } from '../layout/layout-controller'
import type { BrainEdge, BrainGraph, BrainNode, BrainPreset, DiagnosticListener, EdgeKindStyle, KindStyle, LayoutAdapter, LayoutResult, NodeSizeOptions } from '../core/types'
import type { ViewportRendererProps } from './renderer-types'
export type WebGLRendererLoader = () => Promise<{ BrainWebGLRenderer: ComponentType<ViewportRendererProps> }>
const useLayoutEffect = typeof window === 'undefined' ? useEffect : useReactLayoutEffect

export interface BrainProviderProps extends BrainStoreOptions {
  graph: BrainGraph
  preset?: BrainPreset
  children: ReactNode
  defaultSelectedNodeId?: string | null
  defaultExpandedGroups?: readonly string[]
  defaultView?: BrainStoreOptions['view']
  motion?: 'system' | 'reduced' | 'full'
  autoFocus?: boolean
  nodeSize?: NodeSizeOptions
  layoutSeed?: string
  loadWebGLRenderer?: WebGLRendererLoader
  layoutAdapter?: LayoutAdapter
  layoutWorkerFactory?: () => LayoutWorkerPort
  onDiagnostic?: DiagnosticListener
  nodeStyleResolver?: (node: BrainNode, defaults: KindStyle) => KindStyle
  edgeStyleResolver?: (edge: BrainEdge, defaults: EdgeKindStyle) => EdgeKindStyle
  /** Continuous by default in every renderer; opt into preset dash patterns. */
  edgePattern?: 'continuous' | 'declared'
}
interface ContextValue {
  store: BrainStore
  camera: CameraBus
  preset?: BrainPreset
  motion: 'system' | 'reduced' | 'full'
  autoFocus: boolean
  nodeSize: NodeSizeOptions
  layoutSeed: string
  loadWebGLRenderer?: WebGLRendererLoader
  layoutAdapter?: LayoutAdapter
  layoutWorkerFactory?: () => LayoutWorkerPort
  onDiagnostic?: DiagnosticListener
  nodeStyleResolver?: BrainProviderProps['nodeStyleResolver']
  edgeStyleResolver?: BrainProviderProps['edgeStyleResolver']
  edgePattern: 'continuous' | 'declared'
}
const Context = createContext<ContextValue | null>(null)
const defaultSize: NodeSizeOptions = { metric: 'targetTokens', scale: 'sqrt', min: 4, max: 10, unknown: 3 }
export function BrainProvider(props: BrainProviderProps) {
  return <ScopedProvider key={props.graph.scopeKey} {...props} />
}
function ScopedProvider(props: BrainProviderProps) {
  const { graph, preset } = props
  const [store] = useState(() => createBrainStore(graph, { ...props, view: props.view ?? props.defaultView, selectedNodeId: graph.nodes.some(node => node.id === (props.selectedNodeId ?? props.defaultSelectedNodeId)) ? props.selectedNodeId ?? props.defaultSelectedNodeId : null, expandedGroups: props.expandedGroups ?? props.defaultExpandedGroups ?? (graph.nodes.length > 1500 ? [] : getHierarchy(graph, preset).groups.map(group => group.id)) }))
  const [camera] = useState(createCameraBus)
  const previousGraph = useRef(graph)
  store.configure(props)
  useLayoutEffect(() => {
    if (previousGraph.current !== graph) { store.replaceGraph(graph); previousGraph.current = graph }
  }, [graph, store])
  useLayoutEffect(() => { if (props.selectedNodeId !== undefined && props.selectedNodeId !== store.getSnapshot().selectedNodeId) store.select(props.selectedNodeId, true) }, [props.selectedNodeId, store])
  useLayoutEffect(() => { if (props.expandedGroups !== undefined && props.expandedGroups !== store.getSnapshot().expandedGroups) store.setExpandedGroups(props.expandedGroups, true) }, [props.expandedGroups, store])
  useLayoutEffect(() => { if (props.filters && props.filters !== store.getSnapshot().filters) store.setFilters(props.filters, true) }, [props.filters, store])
  useLayoutEffect(() => { if (props.view && props.view !== store.getSnapshot().view) store.setView(props.view, true) }, [props.view, store])
  useEffect(() => { store.resume(); return () => store.dispose() }, [store])
  const value = useMemo<ContextValue>(() => ({ store, camera, preset, motion: props.motion ?? 'system', autoFocus: props.autoFocus ?? true, nodeSize: props.nodeSize ?? defaultSize, layoutSeed: props.layoutSeed ?? 'brain-v1', loadWebGLRenderer: props.loadWebGLRenderer, layoutAdapter: props.layoutAdapter, layoutWorkerFactory: props.layoutWorkerFactory, onDiagnostic: props.onDiagnostic, nodeStyleResolver: props.nodeStyleResolver, edgeStyleResolver: props.edgeStyleResolver, edgePattern: props.edgePattern ?? 'continuous' }), [store, camera, preset, props.motion, props.autoFocus, props.nodeSize, props.layoutSeed, props.loadWebGLRenderer, props.layoutAdapter, props.layoutWorkerFactory, props.onDiagnostic, props.nodeStyleResolver, props.edgeStyleResolver, props.edgePattern])
  return <Context.Provider value={value}>{props.children}</Context.Provider>
}
export function useBrainContext() {
  const context = useContext(Context)
  if (!context) throw new Error('Brain components require a BrainProvider')
  return context
}
export function useBrain() {
  const context = useBrainContext()
  const snapshot = useSyncExternalStore(context.store.subscribe, context.store.getSnapshot, context.store.getSnapshot)
  const index = useMemo(() => createGraphIndex(snapshot.graph), [snapshot.graph])
  const hierarchy = useMemo(() => getHierarchy(snapshot.graph, context.preset), [snapshot.graph, context.preset])
  const hierarchyErrors = useMemo(() => validateHierarchy(snapshot.graph, hierarchy), [snapshot.graph, hierarchy])
  const projection = useMemo(() => projectGraph(snapshot.graph, hierarchyErrors.length ? { groups: [], memberships: [] } : hierarchy, snapshot.expandedGroups, snapshot.filters, snapshot.selectedNodeId), [snapshot.graph, hierarchy, hierarchyErrors, snapshot.expandedGroups, snapshot.filters, snapshot.selectedNodeId])
  const select = (id: string | null) => {
    context.camera.pause()
    const visible = projection.nodes.find(node => node.id === id)
    if (visible?.groupId) { context.store.setExpandedGroups([...snapshot.expandedGroups, visible.groupId]); return }
    const canonical = visible?.canonicalId ?? id
    context.store.select(canonical)
    if (canonical && context.autoFocus) context.camera.send({ type: 'focus', nodeIds: [canonical] })
  }
  const selectEdge = (edge: BrainEdge) => {
    const destination = edge.target === snapshot.selectedNodeId ? edge.source : edge.target
    const target = projection.nodes.find(node => node.id === destination)
    if (target?.groupId) context.store.setExpandedGroups([...snapshot.expandedGroups, target.groupId])
    context.store.select(target?.canonicalId ?? (index.nodes.has(destination) ? destination : null))
    context.store.setEdge(edge.id)
    context.camera.send({ type: 'focus', nodeIds: [edge.source, edge.target] })
  }
  return { ...context, ...snapshot, index, hierarchy, hierarchyErrors, projection, select, selectEdge,
    nodeStyle: (node: BrainNode) => context.nodeStyleResolver?.(node, resolveNodeStyle(node.kind, context.preset)) ?? resolveNodeStyle(node.kind, context.preset),
    edgeStyle: (edge: BrainEdge) => {
      const style = context.edgeStyleResolver?.(edge, resolveEdgeStyle(edge.kind, context.preset)) ?? resolveEdgeStyle(edge.kind, context.preset)
      return context.edgePattern === 'declared' ? style : { ...style, dashed: false }
    },
  }
}
export function useBrainLayout(dimensions: 2 | 3 = 3): LayoutResult {
  const { projection, graph, view, layoutSeed, layoutAdapter, layoutWorkerFactory, onDiagnostic } = useBrain()
  const previous = useRef<{ key: string; value: LayoutResult } | null>(null)
  const input = useMemo(() => ({ graph: { ...graph, nodes: projection.nodes, edges: projection.edges }, seed: layoutSeed, dimensions }), [graph, projection, layoutSeed, dimensions])
  const key = `${graph.scopeKey}:${view.layout}:${dimensions}:${layoutSeed}`
  const bounded = useMemo(() => (view.layout === 'brain' ? brainLayout : clusterLayout)({ ...input, previous: previous.current?.key === key ? previous.current.value.positions : undefined }), [input, view.layout, key])
  const [customResult, setCustomResult] = useState<{ key: string; input: typeof input; result: LayoutResult } | null>(null)
  const currentResult = customResult?.key === key && customResult.input === input ? customResult.result : bounded
  useLayoutEffect(() => { previous.current = { key, value: currentResult } }, [key, currentResult])
  useEffect(() => {
    if (!layoutAdapter && !layoutWorkerFactory) return
    const controller = createLayoutController({ workerFactory: layoutWorkerFactory, onFallback: () => onDiagnostic?.({ category: 'layout', value: 0 }) })
    const abort = new AbortController()
    void controller.run({ ...input, previous: previous.current?.key === key ? previous.current.value.positions : undefined, signal: abort.signal }, view.layout, layoutAdapter).then(result => { if (result && !abort.signal.aborted) setCustomResult({ key, input, result }) })
    return () => { abort.abort(); controller.cancel() }
  }, [input, layoutAdapter, layoutWorkerFactory, view.layout, key, onDiagnostic])
  return currentResult
}
export function useReducedMotion() {
  const { motion } = useBrainContext()
  const [system, setSystem] = useState(false)
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const sync = () => setSystem(media.matches); sync(); media.addEventListener('change', sync); return () => media.removeEventListener('change', sync) }, [])
  return motion === 'reduced' || (motion === 'system' && system)
}
