'use client'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useBrain, useBrainLayout } from '../../react/BrainProvider'
import type { LayoutResult, PresentationNode } from '../../core/types'
import type { ViewportRendererProps } from '../../react/renderer-types'
import { BrainEnvelope } from './BrainEnvelope'
import { GraphEdges, GraphNodes, updateLabelPosition } from './GraphGeometry'
import { CameraRig } from './CameraRig'
import { neighborhood } from '../../core/graph-index'

function LabelProjection({ labels, elements, layout, width, height }: { labels: readonly PresentationNode[]; elements: RefObject<Map<string, HTMLElement>>; layout: LayoutResult; width: number; height: number }) {
  useFrame(({ camera }) => {
    const used: { x: number; y: number }[] = []
    for (const node of labels) {
      const element = elements.current.get(node.id), point = layout.positions[node.id]
      if (!element || !point) continue
      let position = updateLabelPosition(element, point, camera, width, height, 17)
      if (used.some(other => Math.abs(other.x - position.x) < 112 && Math.abs(other.y - position.y) < 28)) position = updateLabelPosition(element, point, camera, width, height, -32)
      if (used.some(other => Math.abs(other.x - position.x) < 104 && Math.abs(other.y - position.y) < 23)) { element.style.visibility = 'hidden'; continue }
      used.push(position)
    }
  })
  return null
}
export function BrainWebGLRenderer({ width, height, active, onReady, onFailure, renderExtra }: ViewportRendererProps) {
  const { projection, selectedNodeId, selectedEdgeId, index, select, view, nodeStyle } = useBrain(), layout = useBrainLayout(3)
  const [hover, setHover] = useState<string | null>(null), root = useRef<HTMLDivElement>(null)
  const labelsRef = useRef(new Map<string, HTMLElement>()), moved = useRef(false), pointerStart = useRef<readonly [number, number] | null>(null)
  const [envelopeColor, setEnvelopeColor] = useState('#53afa8')
  useEffect(() => { const explorer = root.current?.closest('.brain-explorer'); if (!explorer) return; const read = () => setEnvelopeColor(getComputedStyle(explorer).getPropertyValue('--brain-contour').trim() || '#53afa8'); read(); const observer = new MutationObserver(read); observer.observe(explorer, { attributes: true }); return () => observer.disconnect() }, [])
  const labels = useMemo(() => {
    const edge = projection.edges.find(item => item.id === selectedEdgeId || item.originalEdgeIds?.includes(selectedEdgeId ?? ''))
    const neighbors = selectedNodeId ? neighborhood(index, selectedNodeId, 1) : null
    const priorities = [...projection.nodes].sort((a, b) => {
      const score = (node: PresentationNode) => node.id === selectedNodeId || node.id === hover ? 0 : node.id === edge?.source || node.id === edge?.target ? 1 : node.kind === 'aggregate' ? 2 : node.kind === 'pack' ? 3 : node.kind === 'skill' ? 4 : neighbors?.has(node.id) ? 5 : 9
      return score(a) - score(b)
    })
    return priorities.filter(node => ['pack', 'skill', 'aggregate'].includes(node.kind) || node.id === selectedNodeId || node.id === hover || node.id === edge?.source || node.id === edge?.target || (projection.nodes.length < 40 && node.kind !== 'page')).slice(0, 16)
  }, [projection, selectedNodeId, selectedEdgeId, index, hover])
  const hovered = projection.nodes.find(node => node.id === hover)
  return <div className="brain-webgl" ref={root} data-renderer="webgl" onPointerDownCapture={event => { pointerStart.current = [event.clientX, event.clientY]; moved.current = false }} onPointerMoveCapture={event => { if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current[0], event.clientY - pointerStart.current[1]) > 5) moved.current = true }} onPointerUpCapture={() => { pointerStart.current = null }}>
    <Canvas frameloop={active ? 'demand' : 'never'} dpr={[1, view.quality === 'high' ? 1.5 : 1]} camera={{ position: [0, 3.2, 10], fov: 36, near: 0.05, far: 80 }} gl={{ antialias: view.quality === 'high', alpha: true, powerPreference: 'high-performance' }} onPointerMissed={() => { if (!moved.current) select(null) }} aria-label="3D knowledge brain. Equivalent entities are available in the accessible list.">
      <CameraRig layout={layout} active={active} onReady={onReady} onFailure={onFailure} />
      {view.layout === 'brain' && <BrainEnvelope quality={view.quality} color={envelopeColor} />}
      <GraphEdges layout={layout} /><GraphNodes layout={layout} moved={moved} onHover={setHover} />
      <LabelProjection labels={labels} elements={labelsRef} layout={layout} width={width} height={height} />
      {renderExtra?.()}
    </Canvas>
    <div className="brain-world-labels" aria-hidden="true">{labels.map(node => <span key={node.id} ref={element => { if (element) labelsRef.current.set(node.id, element); else labelsRef.current.delete(node.id) }} className={`brain-world-label ${node.id === selectedNodeId ? 'is-selected' : ''} ${node.kind === 'skill' ? 'is-procedural' : ''}`}>{node.label}{node.loadedCount ? <b>{node.loadedCount}</b> : null}</span>)}</div>
    {hovered && !moved.current && <div className="brain-hover-tooltip" role="tooltip"><strong>{hovered.label}</strong><span>{nodeStyle(hovered).label} · {hovered.version ?? 'version unknown'}{hovered.loadedCount ? ` · ${hovered.loadedCount} loaded; total ${hovered.totalCount ?? 'unknown'}` : ''}</span></div>}
  </div>
}
