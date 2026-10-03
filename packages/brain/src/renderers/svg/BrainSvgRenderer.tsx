'use client'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useBrain, useBrainLayout } from '../../react/BrainProvider'
import { clamp, homeCamera, nodeRadius } from '../../core/camera'
import { loadedDegree, neighborhood } from '../../core/graph-index'
import { matchObservation } from '../../core/resolution'
import { brainSurface } from '../../layout/brain-layout'
import type { ViewportRendererProps } from '../../react/renderer-types'
import type { PresentationNode } from '../../core/types'
export function BrainSvgRenderer({ width, height, active }: ViewportRendererProps) {
  const brain = useBrain(), layout = useBrainLayout(2), markerId = useId().replaceAll(':', '')
  const { camera, projection, selectedNodeId, selectedEdgeId, index, select, selectEdge, nodeStyle, edgeStyle, nodeSize, view, observation, graph } = brain
  const svgRef = useRef<SVGSVGElement>(null), groupRef = useRef<SVGGElement>(null)
  const drag = useRef<{ x: number; y: number; dx: number; dy: number; moved: boolean; pointer: number } | null>(null)
  const pointers = useRef(new Map<number, readonly [number, number]>()), pinchDistance = useRef<number | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const scale = Math.max(15, Math.min(width / 8.7, height / 6.8))
  const neighborIds = useMemo(() => selectedNodeId ? neighborhood(index, selectedNodeId, 1) : null, [index, selectedNodeId])
  const matches = useMemo(() => observation ? matchObservation(graph, observation) : [], [graph, observation])
  const pathFor = (side: -1 | 1) => Array.from({ length: 90 }, (_, i) => { const v = i / 89 * Math.PI, p = brainSurface(side === -1 ? 0 : Math.PI * 2, v, side); return `${i === 0 ? 'M' : 'L'}${p[0] * scale},${-p[1] * scale}` }).join(' ')
  function sync() {
    const s = camera.state
    groupRef.current?.setAttribute('transform', `translate(${width / 2 + s.pan[0]},${height / 2 + s.pan[1]}) scale(${s.zoom}) rotate(${(s.yaw - homeCamera.yaw) * 180 / Math.PI})`)
  }
  useEffect(() => { sync() })
  useEffect(() => {
    if (!active) return
    return camera.onCommand(command => {
      const state = camera.state
      if (command.type === 'reset') camera.state = { ...homeCamera }
      if (command.type === 'fit') { const span = Math.max(layout.bounds.max[0] - layout.bounds.min[0], layout.bounds.max[1] - layout.bounds.min[1]); camera.state = { ...state, pan: [0, 0], zoom: clamp(5.3 / Math.max(2, span), 0.35, 3) } }
      if (command.type === 'rotate') camera.state = { ...state, yaw: state.yaw + command.yaw, pitch: clamp(state.pitch + command.pitch, 0.25, Math.PI - 0.25), pan: [state.pan[0], state.pan[1] + command.pitch * 50] }
      if (command.type === 'zoom') camera.state = { ...state, zoom: clamp(state.zoom * command.factor, 0.25, 5), distance: clamp(state.distance / command.factor, 3, 24) }
      if (command.type === 'focus') { const positions = command.nodeIds.map(id => layout.positions[projection.canonicalToVisible.get(id) ?? id]).filter(Boolean); if (positions.length) { const x = positions.reduce((sum, p) => sum + p[0], 0) / positions.length, y = positions.reduce((sum, p) => sum + p[1], 0) / positions.length; camera.state = { ...state, pan: [-x * scale * state.zoom * 0.35, y * scale * state.zoom * 0.35] } } }
      sync()
    })
  }, [active, camera, layout, width, height, projection, scale])
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !active) return
    const wheel = (event: WheelEvent) => { event.preventDefault(); camera.pause(); const factor = Math.exp(-event.deltaY * 0.001); camera.state = { ...camera.state, zoom: clamp(camera.state.zoom * factor, 0.25, 5) }; sync() }
    svg.addEventListener('wheel', wheel, { passive: false })
    return () => svg.removeEventListener('wheel', wheel)
  }, [active, width, height, camera])
  useEffect(() => {
    if (!active) return
    let frame = 0, previous = 0
    const run = (time: number) => { if (camera.autoRotate && !document.hidden) { const delta = previous ? Math.min(0.05, (time - previous) / 1000) : 0; camera.state = { ...camera.state, yaw: camera.state.yaw + delta * 0.15 }; sync(); previous = time; frame = requestAnimationFrame(run) } }
    const wake = () => { cancelAnimationFrame(frame); previous = 0; if (camera.autoRotate) frame = requestAnimationFrame(run) }
    const stop = camera.subscribe(wake); wake()
    return () => { stop(); cancelAnimationFrame(frame) }
  }, [active, camera, width, height])
  const selectedEdge = projection.edges.find(edge => edge.id === selectedEdgeId || edge.originalEdgeIds?.includes(selectedEdgeId ?? ''))
  const labeled = projection.nodes.filter(node => node.kind === 'pack' || node.kind === 'skill' || node.kind === 'aggregate' || node.id === selectedNodeId || node.id === hover || selectedEdge?.source === node.id || selectedEdge?.target === node.id).slice(0, 22)
  const edges = projection.edges.filter(edge => projection.nodes.length <= 120 || edge.source === selectedNodeId || edge.target === selectedNodeId || edge.id === selectedEdgeId).slice(0, 600)
  function glyph(node: PresentationNode, r: number) {
    const style = nodeStyle(node)
    if (style.shape === 'diamond') return <polygon points={`0,${-r * 1.4} ${r * 1.25},0 0,${r * 1.4} ${-r * 1.25},0`} />
    if (style.shape === 'square') return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx="2" />
    if (style.shape === 'hexagon') return <polygon points={Array.from({ length: 6 }, (_, i) => `${Math.cos(i * Math.PI / 3) * r * 1.2},${Math.sin(i * Math.PI / 3) * r * 1.2}`).join(' ')} />
    return <circle r={r} />
  }
  return <svg ref={svgRef} className="brain-svg-renderer" data-renderer="svg" width={Math.max(1, width)} height={Math.max(1, height)} viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`} aria-label="Interactive 2D knowledge graph. Drag to pan; use the accessible list for keyboard entity navigation."
    onPointerDown={event => { camera.pause(); pointers.current.set(event.pointerId, [event.clientX, event.clientY]); if (pointers.current.size === 2) { const values = [...pointers.current.values()]; pinchDistance.current = Math.hypot(values[0][0] - values[1][0], values[0][1] - values[1][1]) } drag.current = { x: event.clientX, y: event.clientY, dx: camera.state.pan[0], dy: camera.state.pan[1], moved: false, pointer: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId) }}
    onPointerMove={event => { if (!pointers.current.has(event.pointerId)) return; pointers.current.set(event.pointerId, [event.clientX, event.clientY]); if (pointers.current.size === 2) { const values = [...pointers.current.values()], distance = Math.hypot(values[0][0] - values[1][0], values[0][1] - values[1][1]); if (pinchDistance.current) camera.state = { ...camera.state, zoom: clamp(camera.state.zoom * distance / pinchDistance.current, 0.25, 5) }; pinchDistance.current = distance; if (drag.current) drag.current.moved = true; sync(); return } const start = drag.current; if (!start) return; const dx = event.clientX - start.x, dy = event.clientY - start.y; if (Math.hypot(dx, dy) > 5) start.moved = true; if (start.moved) { camera.state = { ...camera.state, pan: [start.dx + dx, start.dy + dy] }; sync() } }}
    onPointerUp={event => { const start = drag.current; pointers.current.delete(event.pointerId); pinchDistance.current = null; drag.current = null; if (!start || start.moved) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-node-id],[data-edge-id]'); const nodeId = target?.getAttribute('data-node-id'), edgeId = target?.getAttribute('data-edge-id'); if (nodeId) select(nodeId); else if (edgeId) { const edge = projection.edges.find(candidate => candidate.id === edgeId); if (edge) selectEdge(edge) } else select(null) }}
    onPointerCancel={() => { drag.current = null; pointers.current.clear(); pinchDistance.current = null }}>
    <defs><marker id={markerId} markerWidth="7" markerHeight="7" refX="12" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" /></marker></defs>
    <g ref={groupRef}>
      {view.layout === 'brain' && <g className="brain-svg-contours" aria-hidden="true">{([-1, 1] as const).map(side => <path key={side} d={pathFor(side)} fill="none" stroke="var(--brain-factual)" opacity="0.16" strokeWidth="1" />)}{Array.from({ length: 8 }, (_, ring) => <ellipse key={ring} cx="0" cy="0" rx={(2.75 - ring * 0.075) * scale} ry={(2.15 - ring * 0.06) * scale} fill="none" stroke="var(--brain-factual)" strokeOpacity={0.015 + ring * 0.002} />)}</g>}
      {edges.map(edge => { const source = layout.positions[edge.source], target = layout.positions[edge.target]; if (!source || !target) return null; const focus = edge.id === selectedEdgeId || edge.originalEdgeIds?.includes(selectedEdgeId ?? '') || edge.source === selectedNodeId || edge.target === selectedNodeId; const style = edgeStyle(edge); const self = edge.source === edge.target; return <g key={edge.id} data-edge-id={edge.id}><path d={self ? `M${source[0] * scale},${-source[1] * scale}c-32,-40 32,-40 0,0` : `M${source[0] * scale},${-source[1] * scale}L${target[0] * scale},${-target[1] * scale}`} stroke={style.color} strokeWidth={focus ? 2 : 1} opacity={focus ? 0.9 : selectedNodeId ? 0.12 : 0.28} strokeDasharray={style.dashed ? '4 5' : undefined} fill="none" markerEnd={edge.directed ? `url(#${markerId})` : undefined} /><path d={`M${source[0] * scale},${-source[1] * scale}L${target[0] * scale},${-target[1] * scale}`} stroke="transparent" strokeWidth="12" /><title>{index.nodes.get(edge.source)?.label ?? edge.source} {edge.directed ? '→' : '↔'} {index.nodes.get(edge.target)?.label ?? edge.target} · {style.label} · {edge.evidence.origin}</title></g> })}
      {projection.nodes.map(node => { const p = layout.positions[node.id]; if (!p) return null; const style = nodeStyle(node), r = nodeRadius(node, nodeSize, loadedDegree(index, node.canonicalId ?? node.id)); const selected = (node.canonicalId ?? node.id) === selectedNodeId; const outcome = matches.find(match => match.nodeId === (node.canonicalId ?? node.id)); const color = outcome?.section.outcome === 'included' ? 'var(--brain-included)' : outcome?.section.outcome === 'dropped' ? 'var(--brain-procedural)' : style.color; return <g key={node.id} className="brain-svg-node" data-node-id={node.id} transform={`translate(${p[0] * scale},${-p[1] * scale})`} onPointerEnter={() => setHover(node.id)} onPointerLeave={() => setHover(null)} opacity={neighborIds && !neighborIds.has(node.canonicalId ?? node.id) && node.kind !== 'aggregate' ? 0.38 : 1}>
        <circle r={Math.max(14, r + 7)} fill="transparent" />{selected && <circle r={r + 7} stroke={color} strokeWidth="1.5" fill="none" />}
        <g fill={color} stroke={color} strokeWidth={selected ? 1.5 : 0.5} fillOpacity={node.kind === 'pack' ? 0.4 : 0.9}>{glyph(node, r)}</g><title>{node.label} · {style.label}{node.loadedCount ? ` · ${node.loadedCount} loaded members; total ${node.totalCount ?? 'unknown'}` : ''}</title>
        {labeled.includes(node) && <text y={r + 22} textAnchor="middle" className={selected ? 'is-selected' : ''}>{node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label}{node.loadedCount ? ` (${node.loadedCount})` : ''}</text>}
      </g> })}
    </g>
  </svg>
}
