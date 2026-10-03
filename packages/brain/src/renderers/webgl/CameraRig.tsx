'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Spherical, Vector3, PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useBrain, useReducedMotion } from '../../react/BrainProvider'
import { clamp, homeCamera } from '../../core/camera'
import type { LayoutResult } from '../../core/types'
import type { ViewportRendererProps } from '../../react/renderer-types'
export function CameraRig({ layout, active, onReady, onFailure }: { layout: LayoutResult } & Pick<ViewportRendererProps, 'active' | 'onReady' | 'onFailure'>) {
  const { camera: bus, projection, onDiagnostic } = useBrain(), reduced = useReducedMotion()
  const { camera, gl, invalidate, size, setDpr } = useThree()
  const controls = useRef<OrbitControls | null>(null), transition = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const frameTimes = useRef<number[]>([]), slowWindows = useRef(0), lastFrame = useRef(0)
  const readyRef = useRef(onReady); readyRef.current = onReady
  const failureRef = useRef(onFailure); failureRef.current = onFailure
  const activeRef = useRef(active); activeRef.current = active
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement)
    controls.current = orbit
    const state = bus.state
    camera.position.copy(new Vector3().setFromSpherical(new Spherical(state.distance, state.pitch, state.yaw)).add(new Vector3(...state.target)))
    orbit.target.set(...state.target)
    orbit.enableDamping = !reduced; orbit.dampingFactor = 0.11; orbit.minPolarAngle = 0.25; orbit.maxPolarAngle = Math.PI - 0.25
    orbit.minDistance = 3.5; orbit.maxDistance = 26; orbit.enablePan = true; orbit.panSpeed = 0.5; orbit.rotateSpeed = 0.6; orbit.zoomSpeed = 0.7; orbit.autoRotateSpeed = 0.5
    const changed = () => {
      const spherical = new Spherical().setFromVector3(camera.position.clone().sub(orbit.target))
      if (orbit.target.length() > 8) orbit.target.clampLength(0, 8)
      bus.state = { ...bus.state, yaw: spherical.theta, pitch: spherical.phi, distance: spherical.radius, target: [orbit.target.x, orbit.target.y, orbit.target.z] }
      invalidate()
    }
    const started = () => { transition.current = null; bus.pause() }
    orbit.addEventListener('change', changed); orbit.addEventListener('start', started); orbit.update()
    const unsubscribe = bus.subscribe(() => { orbit.autoRotate = bus.autoRotate && activeRef.current; invalidate() })
    const contextLost = (event: Event) => { event.preventDefault(); failureRef.current?.('context-lost') }
    gl.domElement.addEventListener('webglcontextlost', contextLost)
    readyRef.current?.(); invalidate()
    return () => { unsubscribe(); orbit.removeEventListener('change', changed); orbit.removeEventListener('start', started); orbit.dispose(); controls.current = null; gl.domElement.removeEventListener('webglcontextlost', contextLost) }
  }, [bus, camera, gl, invalidate, reduced])
  useEffect(() => {
    if (controls.current) { controls.current.enabled = active; controls.current.autoRotate = active && bus.autoRotate }
    if (!active) { transition.current = null; bus.pause() }
    else invalidate()
  }, [active, bus, invalidate])
  useEffect(() => bus.onCommand(command => {
    const orbit = controls.current
    if (!orbit || !active) return
    let target = orbit.target.clone(), position = camera.position.clone()
    const spherical = new Spherical().setFromVector3(position.clone().sub(target))
    if (command.type === 'reset') { target.set(...homeCamera.target); spherical.set(homeCamera.distance, homeCamera.pitch, homeCamera.yaw) }
    if (command.type === 'rotate') { spherical.theta += command.yaw; spherical.phi = clamp(spherical.phi + command.pitch, 0.25, Math.PI - 0.25) }
    if (command.type === 'zoom') spherical.radius = clamp(spherical.radius / command.factor, 3.5, 26)
    if (command.type === 'fit') {
      const min = new Vector3(...layout.bounds.min), max = new Vector3(...layout.bounds.max), span = max.clone().sub(min)
      target = min.add(max).multiplyScalar(0.5)
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 36
      spherical.radius = clamp(Math.max(span.y, span.x / Math.max(0.3, size.width / size.height), 2.5) / (2 * Math.tan(fov * Math.PI / 360)) * 1.4, 5, 24)
    }
    if (command.type === 'focus') {
      const positions = command.nodeIds.map(id => layout.positions[projection.canonicalToVisible.get(id) ?? id]).filter(Boolean)
      if (!positions.length) return
      target = positions.reduce((sum, p) => sum.add(new Vector3(...p)), new Vector3()).divideScalar(positions.length).multiplyScalar(0.32)
      spherical.theta = Math.atan2(target.x, Math.max(1, 4 + target.z))
      spherical.phi = clamp(1.25 - target.y * 0.04, 0.5, 2.5)
    }
    position = new Vector3().setFromSpherical(spherical).add(target)
    if (reduced) { orbit.target.copy(target); camera.position.copy(position); orbit.update(); transition.current = null }
    else transition.current = { position, target }
    invalidate()
  }), [active, bus, camera, invalidate, layout, projection, reduced, size])
  useFrame((_, delta) => {
    if (!active || !controls.current) return
    const orbit = controls.current, animation = transition.current
    if (animation) {
      const amount = 1 - Math.exp(-12 * Math.min(delta, 0.08))
      camera.position.lerp(animation.position, amount); orbit.target.lerp(animation.target, amount)
      if (camera.position.distanceTo(animation.position) + orbit.target.distanceTo(animation.target) < 0.003) transition.current = null
      invalidate()
    }
    orbit.update()
    if (orbit.autoRotate) invalidate()
    const time = performance.now(), ms = time - lastFrame.current
    lastFrame.current = time
    if (ms > 0 && ms < 250 && (orbit.autoRotate || animation)) {
      frameTimes.current.push(ms)
      if (frameTimes.current.length === 90) {
        const sorted = [...frameTimes.current].sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * 0.95)]
        onDiagnostic?.({ category: 'frame-sample', durationMs: p95, value: sorted[45], nodeCount: projection.nodes.length, edgeCount: projection.edges.length })
        if (p95 > 75) slowWindows.current++; else if (p95 < 35) slowWindows.current = Math.max(0, slowWindows.current - 1)
        if (slowWindows.current === 2) setDpr(1)
        if (slowWindows.current >= 4) failureRef.current?.('slow-frames')
        frameTimes.current = []
      }
    }
  })
  return null
}
