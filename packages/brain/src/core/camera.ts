import type { BrainNode, CameraCommand, CameraState, NodeSizeOptions } from './types'
export const homeCamera: CameraState = { yaw: 0.16, pitch: 1.26, distance: 10.4, target: [0, 0, 0], pan: [0, 0], zoom: 1 }
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export function createCameraBus() {
  let state: CameraState = { ...homeCamera }, autoRotate = false
  const commands = new Set<(command: CameraCommand) => void>(), listeners = new Set<() => void>()
  let sequence = 0
  return {
    get state() { return state },
    set state(next: CameraState) { state = next },
    get autoRotate() { return autoRotate },
    getSnapshot: () => `${sequence}:${autoRotate}`,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    onCommand(listener: (command: CameraCommand) => void) { commands.add(listener); return () => { commands.delete(listener) } },
    send(command: CameraCommand) { autoRotate = false; commands.forEach(listener => listener(command)); sequence++; listeners.forEach(listener => listener()) },
    setAutoRotate(value: boolean) { autoRotate = value; sequence++; listeners.forEach(listener => listener()) },
    pause() { if (autoRotate) { autoRotate = false; sequence++; listeners.forEach(listener => listener()) } },
  }
}
export type CameraBus = ReturnType<typeof createCameraBus>
export function nodeRadius(node: BrainNode, options: NodeSizeOptions, degree?: number): number {
  const value = options.metric === 'loadedDegree' ? degree : node.metrics?.[options.metric]
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return options.unknown ?? options.min * 0.8
  const normalized = options.scale === 'sqrt' ? Math.sqrt(value / 1600) : value / 1600
  return clamp(options.min + normalized * (options.max - options.min), options.min, options.max)
}
