'use client'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, InstancedMesh, Object3D, Vector3, Quaternion, Group, type Camera } from 'three'
import type { LayoutResult, NodeShape, PresentationNode } from '../../core/types'
import { useBrain } from '../../react/BrainProvider'
import { nodeRadius } from '../../core/camera'
import { edgeIntervals } from './edge-intervals'
import { loadedDegree, neighborhood } from '../../core/graph-index'
import { matchObservation } from '../../core/resolution'
import { stableHash } from '../../core/identity'

function InstanceGroup({ nodes, shape, layout, moved, onHover }: { nodes: readonly PresentationNode[]; shape: NodeShape; layout: LayoutResult; moved: { current: boolean }; onHover: (id: string | null) => void }) {
  const { nodeStyle, select, selectedNodeId, index, nodeSize, observation, graph } = useBrain()
  const mesh = useRef<InstancedMesh>(null), halo = useRef<InstancedMesh>(null)
  const neighbors = useMemo(() => selectedNodeId ? neighborhood(index, selectedNodeId, 1) : null, [index, selectedNodeId])
  const matches = useMemo(() => observation ? matchObservation(graph, observation) : [], [graph, observation])
  useLayoutEffect(() => {
    if (!mesh.current || !halo.current) return
    const object = new Object3D()
    nodes.forEach((node, i) => {
      const position = layout.positions[node.id]
      if (!position) return
      const id = node.canonicalId ?? node.id, radius = nodeRadius(node, nodeSize, loadedDegree(index, id)) / 95
      object.position.set(...position); object.rotation.set(shape === 'hexagon' ? Math.PI / 2 : 0, 0, shape === 'square' ? 0.2 : 0); object.scale.setScalar(radius); object.updateMatrix()
      mesh.current!.setMatrixAt(i, object.matrix)
      const match = matches.find(result => result.nodeId === id)
      const style = nodeStyle(node), color = new Color(match?.section.outcome === 'included' ? '#74d5a1' : match?.section.outcome === 'dropped' ? '#e8bd72' : style.color)
      if (neighbors && !neighbors.has(id) && node.kind !== 'aggregate') color.multiplyScalar(0.47)
      mesh.current!.setColorAt(i, color)
      object.scale.setScalar(radius * (id === selectedNodeId ? 3.1 : 2.25)); object.updateMatrix(); halo.current!.setMatrixAt(i, object.matrix); halo.current!.setColorAt(i, color)
    })
    mesh.current.instanceMatrix.needsUpdate = true; halo.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    if (halo.current.instanceColor) halo.current.instanceColor.needsUpdate = true
    mesh.current.computeBoundingSphere(); halo.current.computeBoundingSphere()
  }, [nodes, layout, selectedNodeId, neighbors, matches, nodeSize, index, nodeStyle, shape])
  const pick = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (moved.current || event.delta > 5 || event.instanceId === undefined) return; select(nodes[event.instanceId].id) }
  return <group>
    <instancedMesh ref={mesh} args={[undefined, undefined, nodes.length]} onClick={pick} onPointerOver={event => { event.stopPropagation(); if (event.instanceId !== undefined) onHover(nodes[event.instanceId].id) }} onPointerOut={() => onHover(null)}>
      {shape === 'diamond' ? <octahedronGeometry args={[1.2, 0]} /> : shape === 'square' ? <boxGeometry args={[1.6, 1.6, 1.2]} /> : shape === 'hexagon' ? <cylinderGeometry args={[1.2, 1.2, 0.72, 6]} /> : <sphereGeometry args={[0.8, 10, 8]} />}
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={halo} args={[undefined, undefined, nodes.length]} raycast={() => null}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial transparent opacity={0.075} depthWrite={false} toneMapped={false} /></instancedMesh>
  </group>
}
export function GraphNodes({ layout, moved, onHover }: { layout: LayoutResult; moved: { current: boolean }; onHover: (id: string | null) => void }) {
  const { projection, nodeStyle, selectedNodeId } = useBrain()
  const grouped = useMemo(() => {
    const map = new Map<NodeShape, PresentationNode[]>()
    for (const node of projection.nodes) { const shape = nodeStyle(node).shape; map.set(shape, [...(map.get(shape) ?? []), node]) }
    return map
  }, [projection, nodeStyle])
  const position = selectedNodeId ? layout.positions[projection.canonicalToVisible.get(selectedNodeId) ?? selectedNodeId] : undefined
  return <group>{[...grouped].map(([shape, nodes]) => <InstanceGroup key={shape} nodes={nodes} shape={shape} layout={layout} moved={moved} onHover={onHover} />)}{position && <SelectionRing position={position} />}</group>
}
function SelectionRing({ position }: { position: readonly [number, number, number] }) {
  const ref = useRef<Group>(null)
  useFrame(({ camera }) => { ref.current?.quaternion.copy(camera.quaternion) })
  return <group ref={ref} position={[...position]}><mesh raycast={() => null}><ringGeometry args={[0.16, 0.174, 40]} /><meshBasicMaterial color="#c7fff0" transparent opacity={0.9} depthWrite={false} toneMapped={false} /></mesh><mesh raycast={() => null}><ringGeometry args={[0.205, 0.211, 40]} /><meshBasicMaterial color="#62d9ca" transparent opacity={0.4} depthWrite={false} toneMapped={false} /></mesh></group>
}
export function GraphEdges({ layout }: { layout: LayoutResult }) {
  const { projection, selectedNodeId, selectedEdgeId, edgeStyle } = useBrain()
  const arrowRef = useRef<InstancedMesh>(null)
  const data = useMemo(() => {
    const positions: number[] = [], colors: number[] = [], arrows: { point: Vector3; direction: Vector3; color: Color }[] = []
    const chosen = projection.edges.filter(edge => projection.nodes.length <= 120 || edge.source === selectedNodeId || edge.target === selectedNodeId || edge.id === selectedEdgeId).slice(0, 600)
    for (const edge of chosen) {
      const source = layout.positions[edge.source], target = layout.positions[edge.target]
      if (!source || !target) continue
      const focused = edge.source === selectedNodeId || edge.target === selectedNodeId || edge.id === selectedEdgeId || edge.originalEdgeIds?.includes(selectedEdgeId ?? '')
      const base = new Color(edgeStyle(edge).color), color = base.clone().multiplyScalar(focused ? 0.85 : selectedNodeId ? 0.09 : 0.24)
      const a = new Vector3(...source), b = new Vector3(...target), delta = b.clone().sub(a)
      const self = edge.source === edge.target
      const normal = delta.clone().cross(new Vector3(0, 0, 1)).normalize().multiplyScalar(((stableHash(edge.id) % 9) - 4) * 0.02)
      const point = (t: number) => self ? a.clone().add(new Vector3(Math.sin(t * Math.PI * 2) * 0.23, (1 - Math.cos(t * Math.PI * 2)) * 0.23, 0)) : a.clone().lerp(b, t).add(normal.clone().multiplyScalar(Math.sin(t * Math.PI)))
      for (const [start, end] of edgeIntervals(delta.length(), !!edgeStyle(edge).dashed && !focused, self)) {
        positions.push(...point(start).toArray(), ...point(end).toArray()); colors.push(...color.toArray(), ...color.toArray())
      }
      if (edge.directed && focused) arrows.push({ point: point(0.68), direction: point(0.72).sub(point(0.64)).normalize(), color: base })
    }
    const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return { geometry, arrows }
  }, [projection, layout, selectedNodeId, selectedEdgeId, edgeStyle])
  useEffect(() => () => data.geometry.dispose(), [data])
  useLayoutEffect(() => {
    if (!arrowRef.current) return
    const object = new Object3D(), up = new Vector3(0, 1, 0)
    for (const [i, arrow] of data.arrows.entries()) { object.position.copy(arrow.point); object.quaternion.copy(new Quaternion().setFromUnitVectors(up, arrow.direction)); object.updateMatrix(); arrowRef.current.setMatrixAt(i, object.matrix); arrowRef.current.setColorAt(i, arrow.color) }
    arrowRef.current.instanceMatrix.needsUpdate = true
    if (arrowRef.current.instanceColor) arrowRef.current.instanceColor.needsUpdate = true
    arrowRef.current.computeBoundingSphere()
  }, [data])
  return <group><lineSegments geometry={data.geometry} raycast={() => null}><lineBasicMaterial vertexColors transparent opacity={1} toneMapped={false} /></lineSegments>{data.arrows.length > 0 && <instancedMesh ref={arrowRef} args={[undefined, undefined, data.arrows.length]} raycast={() => null}><coneGeometry args={[0.037, 0.12, 5]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>}</group>
}
export function updateLabelPosition(element: HTMLElement, point: readonly [number, number, number], camera: Camera, width: number, height: number, yOffset = 0) {
  const screen = new Vector3(...point).project(camera)
  const x = (screen.x * 0.5 + 0.5) * width, y = (-screen.y * 0.5 + 0.5) * height + yOffset
  element.style.transform = `translate(${x}px,${y}px) translate(-50%,0)`
  element.style.visibility = screen.z > 1 || screen.z < -1 || x < 20 || x > width - 20 || y < 0 || y > height - 25 ? 'hidden' : 'visible'
  return { x, y }
}
