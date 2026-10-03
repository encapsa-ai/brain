'use client'
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { BrainProvider, useBrain, type BrainProviderProps } from './BrainProvider'
import { BrainViewport, type BrainViewportProps } from './components/BrainViewport'
import { BrainToolbar } from './components/BrainToolbar'
import { BrainTierNavigator } from './components/BrainTierNavigator'
import { BrainInspector, type BrainInspectorProps } from './components/BrainInspector'
import { BrainLegend } from './components/BrainLegend'
import { BrainContextTray, type BrainContextTrayProps } from './components/BrainContextTray'
import { BrainResolutionPanel, type ExplorerMode } from './components/BrainResolutionPanel'
import { BrainAccessibleList } from '../renderers/accessible/BrainAccessibleList'
import { useExplorerFullscreen } from './hooks'
import { Icon } from './components/Icon'
import type { BrainController, LayoutKind, RendererKind } from '../core/types'
export interface BrainExplorerShellProps extends BrainViewportProps, BrainInspectorProps, BrainContextTrayProps {
  className?: string
  style?: CSSProperties
  theme?: 'dark' | 'light'
  toolbarStart?: ReactNode
  toolbarEnd?: ReactNode
  children?: ReactNode
  mode?: ExplorerMode
  onModeChange?: (mode: ExplorerMode) => void
  receiptControls?: ReactNode
  controllerRef?: Ref<BrainController>
  defaultNavigatorOpen?: boolean
}
export interface BrainExplorerProps extends Omit<BrainProviderProps, 'children'>, BrainExplorerShellProps {}
export const BrainExplorer = forwardRef<BrainController, BrainExplorerProps>(function BrainExplorer(props, ref) {
  return <BrainProvider {...props} defaultView={props.defaultView ?? { renderer: props.renderer ?? 'auto', layout: props.layout ?? 'brain', quality: 'high' }}><BrainExplorerShell {...props} renderer={undefined} layout={undefined} controllerRef={ref} /></BrainProvider>
})
export function BrainExplorerShell(props: BrainExplorerShellProps) {
  const brain = useBrain()
  const { graph, filters, store, select, selectedNodeId, selectedEdgeId, index, projection, camera, view } = brain
  const root = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null), navTrigger = useRef<HTMLButtonElement>(null), listTrigger = useRef<HTMLButtonElement>(null), drawer = useRef<HTMLDivElement>(null)
  const fullscreen = useExplorerFullscreen(root)
  const [navigatorOpen, setNavigatorOpen] = useState(props.defaultNavigatorOpen ?? true), [listOpen, setListOpen] = useState(false), [mode, setMode] = useState<ExplorerMode>('inventory')
  const [size, setSize] = useState({ width: 1400, height: 760 }), [hydrated, setHydrated] = useState(false)
  const compact = fullscreen.mode === 'none' && (size.width < 500 || size.height < 340), narrow = size.width < 960
  const searchId = useId(), selected = selectedNodeId ? index.nodes.get(selectedNodeId) : null
  const currentMode = props.mode ?? mode
  const setModeValue = (value: ExplorerMode) => { setMode(value); props.onModeChange?.(value) }
  useImperativeHandle(props.controllerRef, () => ({ focusNode: select, fit: () => camera.send({ type: 'fit' }), resetCamera: () => camera.send({ type: 'reset' }), rotate: (yaw, pitch) => camera.send({ type: 'rotate', yaw, pitch }) }), [select, camera])
  useEffect(() => { setHydrated(true); const element = root.current; if (!element) return; const observer = new ResizeObserver(entries => setSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height })); observer.observe(element); return () => observer.disconnect() }, [])
  useEffect(() => { if (narrow) setNavigatorOpen(false) }, [narrow])
  useEffect(() => {
    if (!listOpen && !(narrow && navigatorOpen)) return
    const element = drawer.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element?.querySelector<HTMLElement>('button,input')?.focus()
    const trap = (event: KeyboardEvent) => { if (event.key !== 'Tab' || !element) return; const items = [...element.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]')].filter(item => item.getClientRects().length); const first = items[0], last = items.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() } }
    element?.addEventListener('keydown', trap)
    return () => { element?.removeEventListener('keydown', trap); previous?.focus() }
  }, [listOpen, narrow, navigatorOpen])
  const results = filters.query ? graph.nodes.filter(node => `${node.label} ${node.canonicalRef ?? ''}`.toLocaleLowerCase().includes(filters.query.toLocaleLowerCase())).slice(0, 8) : []
  const searchSelect = (id: string) => { store.setFilters({ ...filters, query: '' }); select(id); root.current?.querySelector<HTMLElement>('.brain-viewport')?.focus() }
  const edge = graph.edges.find(item => item.id === selectedEdgeId)
  return <div ref={root} className={`brain-explorer ${props.className ?? ''} ${compact ? 'brain-compact' : ''} ${narrow ? 'brain-narrow' : ''} ${fullscreen.mode === 'overlay' ? 'brain-expanded-overlay' : ''}`} data-theme={props.theme ?? 'dark'} data-ready={hydrated} data-fullscreen={fullscreen.mode} data-scope={graph.scopeKey} style={props.style} tabIndex={-1} role={fullscreen.mode === 'overlay' ? 'dialog' : 'region'} aria-modal={fullscreen.mode === 'overlay' ? true : undefined} aria-label={fullscreen.mode === 'overlay' ? 'Expanded explorer overlay, not native fullscreen' : 'Brain Explorer'}
    onPointerDownCapture={event => { if (!(event.target as HTMLElement).closest('.brain-auto-rotate')) camera.pause() }}
    onKeyDownCapture={event => { if (!(event.target as HTMLElement).closest('.brain-auto-rotate')) camera.pause() }}
    onKeyDown={event => {
      if (event.key === '/' && !(event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) { event.preventDefault(); search.current?.focus(); return }
      if (event.key !== 'Escape') return
      if (filters.query) { event.preventDefault(); store.setFilters({ ...filters, query: '' }); search.current?.focus() }
      else if (listOpen) { event.preventDefault(); setListOpen(false); listTrigger.current?.focus() }
      else if (narrow && navigatorOpen) { event.preventDefault(); setNavigatorOpen(false); navTrigger.current?.focus() }
      else if (selectedNodeId && !compact) { event.preventDefault(); select(null); root.current?.querySelector<HTMLElement>('.brain-viewport')?.focus() }
      else if (fullscreen.mode !== 'none') { event.preventDefault(); void fullscreen.exit() }
    }}>
    <div className="brain-explorer-topbar">
      <div className="brain-topbar-leading"><button ref={navTrigger} className="brain-icon-button" aria-label={navigatorOpen ? 'Hide context navigator' : 'Show context navigator'} aria-expanded={navigatorOpen} onClick={() => setNavigatorOpen(!navigatorOpen)}><Icon name="panel" /></button>{props.toolbarStart ?? <span className="brain-default-title"><Icon name="cube" />Brain Explorer</span>}</div>
      <div className="brain-search-container"><label className="brain-search" htmlFor={searchId}><Icon name="search" /><input ref={search} id={searchId} aria-label="Search loaded context" placeholder="Search loaded context…" autoComplete="off" value={filters.query} onChange={event => store.setFilters({ ...filters, query: event.target.value })} onKeyDown={event => { if (event.nativeEvent.isComposing || event.keyCode === 229) return; if (event.key === 'Enter' && results[0]) { event.preventDefault(); searchSelect(results[0].id) } }} /><kbd>/</kbd></label>{filters.query && <div className="brain-search-results"><p>{results.length ? 'Matching loaded entities' : 'No matches in loaded context'}</p><ul>{results.map(node => <li key={node.id}><button onClick={() => searchSelect(node.id)}><strong>{node.label}</strong><span>{node.kind} · {node.version ?? 'unknown version'}</span></button></li>)}</ul></div>}</div>
      <div className="brain-topbar-trailing"><label className="brain-mode-select"><span className="brain-sr-only">Explorer mode</span><select value={currentMode} onChange={event => setModeValue(event.target.value as ExplorerMode)}><option value="inventory">Inventory</option><option value="composition">Composition</option><option value="receipt">Receipt</option><option value="illustrative">Illustrative</option></select></label>{props.toolbarEnd}<button className="brain-icon-button brain-fullscreen-button" aria-label={fullscreen.mode === 'none' ? 'Enter fullscreen' : 'Exit fullscreen'} title={fullscreen.mode === 'overlay' ? 'Exit expanded overlay' : 'Fullscreen'} onClick={() => fullscreen.mode === 'none' ? void fullscreen.enter() : void fullscreen.exit()}><Icon name={fullscreen.mode === 'none' ? 'expand' : 'close'} /></button></div>
      {compact && <button className="brain-button brain-open-explorer" onClick={() => void fullscreen.enter(true)}><Icon name="expand" />Open explorer</button>}
    </div>
    {fullscreen.mode === 'overlay' && <div className="brain-overlay-label">Expanded overlay · not native fullscreen <button className="brain-text-button" onClick={() => void fullscreen.exit()}>Exit overlay</button></div>}
    <div className="brain-workspace">
      {navigatorOpen && !compact && <>{narrow && <button className="brain-drawer-scrim" aria-label="Dismiss navigator" onClick={() => setNavigatorOpen(false)} />}<div className={narrow ? 'brain-mobile-drawer' : 'brain-navigator-container'} ref={narrow ? drawer : undefined} role={narrow ? 'dialog' : undefined} aria-modal={narrow ? true : undefined} aria-label="Context navigator"><BrainTierNavigator onClose={() => { setNavigatorOpen(false); navTrigger.current?.focus() }} /></div></>}
      <div className="brain-center">
        <div className="brain-viewbar"><div className="brain-view-tabs" role="group" aria-label="Graph layout"><button className={view.layout === 'brain' ? 'is-active' : ''} aria-pressed={view.layout === 'brain'} onClick={() => store.setView({ ...view, layout: 'brain' })}><Icon name="cube" /><span>Brain view</span></button><button className={view.layout === 'cluster' ? 'is-active' : ''} aria-pressed={view.layout === 'cluster'} onClick={() => store.setView({ ...view, layout: 'cluster' })}><Icon name="link" /><span>Graph view</span></button></div><div className="brain-view-options"><label><span className="brain-sr-only">Renderer</span><select aria-label="Renderer" value={props.renderer ?? view.renderer} onChange={event => store.setView({ ...view, renderer: event.target.value as RendererKind })}><option value="auto">Auto · 3D</option><option value="webgl">3D WebGL</option><option value="svg">2D graph</option><option value="list">Accessible list</option></select></label><button ref={listTrigger} className="brain-icon-button" aria-label="Open accessible node list" title="Accessible node list" onClick={() => setListOpen(true)}><Icon name="list" /></button></div></div>
        <div className="brain-stage">
          <BrainViewport renderer={props.renderer} layout={props.layout as LayoutKind | undefined} forceWebGLFailure={props.forceWebGLFailure} loadingSlot={props.loadingSlot} emptySlot={props.emptySlot} errorSlot={props.errorSlot} unsupportedSlot={props.unsupportedSlot} renderExtraWebGL={props.renderExtraWebGL} />
          {view.renderer !== 'list' && <><div className="brain-canvas-caption"><span className="brain-eyebrow">Connected knowledge</span><span>{projection.nodes.length.toLocaleString()} visible nodes <i />{graph.nodes.length.toLocaleString()} loaded</span></div><div className="brain-drag-hint"><span className="brain-mouse-icon" />Drag to {view.renderer === 'svg' ? 'pan' : 'rotate'}<span>·</span>Scroll to zoom</div><div className="brain-canvas-controls"><BrainToolbar /></div></>}
          {edge && <div className="brain-focused-edge"><Icon name="link" /><span>{index.nodes.get(edge.source)?.label} {edge.directed ? '→' : '↔'} {index.nodes.get(edge.target)?.label}</span><span>{edge.kind} · {edge.evidence.origin}</span></div>}
          {compact && selected && <button className="brain-compact-selection" onClick={() => void fullscreen.enter(true)}>{selected.label} · inspect <Icon name="right" /></button>}
          {(currentMode === 'receipt' || currentMode === 'illustrative') && !compact && <div className="brain-receipt-overlay"><BrainResolutionPanel illustrative={currentMode === 'illustrative'} controls={currentMode === 'receipt' ? props.receiptControls : undefined} /></div>}
        </div>
        <BrainLegend />
        <div className="brain-spatial-note"><Icon name="info" />Spatial positions are a layout, not semantic similarity.</div>
        <BrainContextTray onPreview={props.onPreview} previewLabel={props.previewLabel} simulated={props.simulated} />
      </div>
      {selectedNodeId && !compact && <div className={narrow ? 'brain-inspector-mobile' : 'brain-inspector-container'}><BrainInspector renderNodeDetails={props.renderNodeDetails} renderNodeActions={props.renderNodeActions} onClose={() => root.current?.querySelector<HTMLElement>('.brain-viewport')?.focus()} /></div>}
      {listOpen && <><button className="brain-drawer-scrim" aria-label="Dismiss accessible node list" onClick={() => setListOpen(false)} /><div className="brain-list-drawer" ref={drawer} role="dialog" aria-modal="true" aria-label="Accessible node list"><div className="brain-panel-heading"><span>Loaded context</span><button className="brain-icon-button" aria-label="Close accessible node list" onClick={() => { setListOpen(false); listTrigger.current?.focus() }}><Icon name="close" /></button></div><BrainAccessibleList /></div></>}
    </div>
    <div className="brain-statusbar"><span><i className="brain-status-dot" />{graph.completeness === 'complete' ? 'Loaded projection' : 'Partial inventory'}<span className="brain-status-divider">/</span>{graph.nodes.length.toLocaleString()} nodes<span className="brain-status-divider">/</span>{graph.edges.length.toLocaleString()} relationships</span><span>{graph.nodes.length > 1500 && projection.nodes.length < graph.nodes.length ? 'Level-of-detail aggregation · ' : ''}Scope isolated<span className="brain-status-divider">·</span>Host-authorized projection</span></div>
    {props.children}
  </div>
}
