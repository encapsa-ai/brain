'use client'
import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { useBrain } from '../BrainProvider'
import { BrainSvgRenderer } from '../../renderers/svg/BrainSvgRenderer'
import { BrainAccessibleList } from '../../renderers/accessible/BrainAccessibleList'
import type { LayoutKind, RendererKind } from '../../core/types'
import { Icon } from './Icon'
class RendererBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}
export interface BrainViewportProps {
  renderer?: RendererKind
  layout?: LayoutKind
  forceWebGLFailure?: boolean
  renderExtraWebGL?: () => ReactNode
  loadingSlot?: ReactNode
  emptySlot?: ReactNode
  errorSlot?: ReactNode
  unsupportedSlot?: ReactNode
}
export function BrainViewport({ renderer, layout, forceWebGLFailure = false, renderExtraWebGL, loadingSlot, emptySlot, errorSlot, unsupportedSlot }: BrainViewportProps) {
  const { view, store, projection, selectedNodeId, index, select, camera, dataStatus, onDiagnostic, loadWebGLRenderer } = useBrain()
  const ref = useRef<HTMLDivElement>(null), [size, setSize] = useState({ width: 0, height: 0 }), [visible, setVisible] = useState(true)
  const [failure, setFailure] = useState<string | null>(null), [readyToken, setReadyToken] = useState<object | null>(null), [attempt, setAttempt] = useState(0)
  const LazyWebGL = useMemo(() => loadWebGLRenderer ? lazy(() => loadWebGLRenderer().then(module => ({ default: module.BrainWebGLRenderer }))) : null, [loadWebGLRenderer, attempt])
  const choice = renderer ?? view.renderer, wantsWebGL = choice === 'auto' || choice === 'webgl', usable3D = wantsWebGL && !!LazyWebGL && !failure && !forceWebGLFailure
  const hasSize = size.width > 0 && size.height > 0, hasNodes = projection.nodes.length > 0, unavailable = dataStatus === 'unavailable'
  const initializationToken = useMemo(() => ({}), [usable3D, LazyWebGL, attempt, hasSize, hasNodes, unavailable])
  const ready = readyToken === initializationToken
  useEffect(() => { if (layout && layout !== view.layout) store.setView({ ...view, layout }) }, [layout, store, view])
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(entries => { const rect = entries[0].contentRect; setSize({ width: Math.round(rect.width), height: Math.round(rect.height) }) })
    observer.observe(element)
    const intersection = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting && !document.hidden))
    intersection.observe(element)
    const visibility = () => { setVisible(!document.hidden); if (document.hidden) camera.pause() }
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', visibility) }
  }, [camera])
  useEffect(() => {
    if (!usable3D || ready || size.width <= 0 || size.height <= 0) return
    const timeout = setTimeout(() => { setFailure('initialization timeout'); onDiagnostic?.({ category: 'renderer-fallback', value: 1 }) }, 6500)
    return () => clearTimeout(timeout)
  }, [usable3D, ready, attempt, size.width, size.height, onDiagnostic])
  useEffect(() => { onDiagnostic?.({ category: 'renderer-selected', value: choice === 'list' ? 2 : usable3D && ready ? 0 : 1, nodeCount: projection.nodes.length, edgeCount: projection.edges.length }) }, [choice, usable3D, ready, onDiagnostic, projection.nodes.length, projection.edges.length])
  const failed = wantsWebGL && (failure || forceWebGLFailure)
  const fail = (category: string) => { setFailure(category); setReadyToken(null); onDiagnostic?.({ category: 'renderer-fallback', value: 1 }) }
  return <div ref={ref} className="brain-viewport" tabIndex={0} aria-label="Knowledge visualization. Arrow keys rotate. Plus and minus zoom. Escape clears selection." data-active-renderer={choice === 'list' ? 'list' : usable3D && ready ? 'webgl' : 'svg'}
    onKeyDown={event => {
      if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return
      const rotations: Record<string, [number, number]> = { ArrowLeft: [-Math.PI / 12, 0], ArrowRight: [Math.PI / 12, 0], ArrowUp: [0, -Math.PI / 12], ArrowDown: [0, Math.PI / 12] }
      if (rotations[event.key]) { event.preventDefault(); const [yaw, pitch] = rotations[event.key]; camera.send({ type: 'rotate', yaw, pitch }) }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); camera.send({ type: 'zoom', factor: 1.2 }) }
      if (event.key === '-') { event.preventDefault(); camera.send({ type: 'zoom', factor: 1 / 1.2 }) }
      if (event.key === 'Escape' && selectedNodeId) { event.preventDefault(); event.stopPropagation(); select(null) }
    }}>
    {dataStatus === 'unavailable' ? errorSlot ?? <div className="brain-empty" role="alert"><Icon name="info" /><h2>Data unavailable</h2><p>The host projection is unavailable or invalid. No policy fallback is attempted.</p></div> : projection.nodes.length === 0 ? emptySlot ?? <div className="brain-empty"><Icon name="search" /><h2>No loaded context to display</h2><p>Adjust the filters or supply an authorized graph.</p></div> : choice === 'list' ? <BrainAccessibleList /> : size.width > 0 && size.height > 0 ? <>
      {(!usable3D || !ready) && <BrainSvgRenderer {...size} active={!usable3D || !ready} />}
      {usable3D && LazyWebGL && <div className={`brain-webgl-layer ${ready ? 'is-ready' : ''}`}><RendererBoundary key={attempt} onError={() => fail('initialization')}><Suspense fallback={null}><LazyWebGL {...size} active={visible} onReady={() => setReadyToken(initializationToken)} onFailure={fail} renderExtra={renderExtraWebGL} /></Suspense></RendererBoundary></div>}
      {choice === 'webgl' && !loadWebGLRenderer && <div className="brain-renderer-notice" role="status">3D unsupported: register the optional WebGL renderer. 2D remains available.</div>}
      {usable3D && !ready && <div className="brain-renderer-notice" role="status">{loadingSlot ?? 'Preparing 3D · 2D remains available'}</div>}
      {failed && <div className="brain-renderer-notice" role="status">{unsupportedSlot ?? <>Renderer downgraded to 2D · {forceWebGLFailure ? 'simulated WebGL failure' : failure}</>}<button className="brain-text-button" onClick={() => { setFailure(null); setReadyToken(null); setAttempt(value => value + 1) }} disabled={forceWebGLFailure}>Retry 3D</button></div>}
    </> : <span className="brain-sr-only">Waiting for a visible container.</span>}
    <div className="brain-sr-only" role="status" aria-live="polite">{selectedNodeId ? `Selected ${index.nodes.get(selectedNodeId)?.label ?? 'entity unavailable'}` : 'No entity selected'}. {choice === 'list' ? 'Accessible list' : usable3D && ready ? '3D WebGL' : '2D graph'} renderer.</div>
  </div>
}
