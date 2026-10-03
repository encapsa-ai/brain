import { describe, expect, it, vi } from 'vitest'
import { brainLayout, brainSurface } from '../src/layout/brain-layout'
import { clusterLayout } from '../src/layout/cluster-layout'
import { createLayoutController, type LayoutWorkerPort } from '../src/layout/layout-controller'
import type { BrainGraph, LayoutInput } from '../src/core/types'
const graph: BrainGraph = { schemaVersion: '1', scopeKey: 's', revision: 'r', completeness: 'complete', nodes: Array.from({ length: 100 }, (_, i) => ({ id: `n${i}`, kind: 'document', label: `Node ${i}`, sourceNamespace: 'test' })), edges: [] }
const input: LayoutInput = { graph, seed: 'seed', dimensions: 3 }
describe('bounded layout geometry', () => {
  it.each([brainLayout, clusterLayout])('handles object-property names as node identities', layout => {
    const unusual = { ...graph, nodes: ['__proto__', 'constructor', 'toString'].map(id => ({ id, label: id, kind: 'document', sourceNamespace: 'test' })) }
    const result = layout({ ...input, graph: unusual, previous: {} })
    expect(Object.keys(result.positions)).toHaveLength(3)
    expect(Object.getPrototypeOf(result.positions)).toBeNull()
    expect(Object.values(result.positions).flat().every(Number.isFinite)).toBe(true)
  })
  it.each([brainLayout, clusterLayout])('is deterministic, finite and immutable', layout => { const original = JSON.stringify(graph); expect(layout(input)).toEqual(layout(input)); expect(Object.values(layout(input).positions).flat().every(Number.isFinite)).toBe(true); expect(JSON.stringify(graph)).toBe(original); expect(layout({ ...input, seed: 'other' }).positions).not.toEqual(layout(input).positions) })
  it.each([brainLayout, clusterLayout])('supports empty and single-node graphs', layout => { expect(Object.keys(layout({ ...input, graph: { ...graph, nodes: [] } }).positions)).toHaveLength(0); expect(Object.keys(layout({ ...input, graph: { ...graph, nodes: graph.nodes.slice(0, 1) } }).positions)).toHaveLength(1) })
  it('retains old positions on append and flattens 2D z', () => { const prior = brainLayout(input); const next = brainLayout({ ...input, graph: { ...graph, nodes: [...graph.nodes, { id: 'new', label: 'New', kind: 'document', sourceNamespace: 'test' }] }, previous: prior.positions }); expect(next.positions.n42).toEqual(prior.positions.n42); expect(Object.values(brainLayout({ ...input, dimensions: 2 }).positions).every(p => p[2] === 0)).toBe(true) })
  it('constructs a finite bilateral envelope with a central fissure', () => { for (let i = 1; i < 40; i++) { const left = brainSurface(i, i / 40 * Math.PI, -1), right = brainSurface(i, i / 40 * Math.PI, 1); expect(left.every(Number.isFinite)).toBe(true); expect(left[0]).toBeLessThan(0); expect(right[0]).toBeGreaterThan(0) } })
  it('honors abort before layout', () => { const abort = new AbortController(); abort.abort(); expect(() => brainLayout({ ...input, signal: abort.signal })).toThrow('Layout cancelled') })
  it('times out a worker and terminates it before bounded fallback', async () => { const terminate = vi.fn(), fallback = vi.fn(); const port: LayoutWorkerPort = { onmessage: null, onerror: null, postMessage() {}, terminate }; const controller = createLayoutController({ workerFactory: () => port, timeoutMs: 5, onFallback: fallback }); expect(await controller.run(input, 'brain')).toEqual(brainLayout(input)); expect(terminate).toHaveBeenCalledOnce(); expect(fallback).toHaveBeenCalledOnce() })
  it('rejects stale protocol, scope and revision results', async () => { const port: LayoutWorkerPort = { onmessage: null, onerror: null, terminate() {}, postMessage(message) { queueMicrotask(() => port.onmessage?.({ data: { protocol: 1, requestId: message.requestId, result: { ...brainLayout(input), scopeKey: 'other' } } })) } }; const fallback = vi.fn(); const result = await createLayoutController({ workerFactory: () => port, timeoutMs: 5, onFallback: fallback }).run(input, 'brain'); expect(result?.scopeKey).toBe('s'); expect(fallback).toHaveBeenCalledOnce() })
  it('discards a cancelled pending worker', async () => { const terminate = vi.fn(); const controller = createLayoutController({ workerFactory: () => ({ onmessage: null, onerror: null, postMessage() {}, terminate }), timeoutMs: 50 }); const pending = controller.run(input, 'brain'); controller.cancel(); expect(await pending).toBeNull(); expect(terminate).toHaveBeenCalled() })
  it('bounds custom adapters too', async () => { const result = await createLayoutController({ timeoutMs: 5 }).run(input, 'cluster', () => new Promise(() => {})); expect(result).toEqual(clusterLayout(input)) })
  it('aborts custom adapter work when its time budget expires', async () => {
    let signal: AbortSignal | undefined
    const result = await createLayoutController({ timeoutMs: 5 }).run(input, 'brain', next => { signal = next.signal; return new Promise(() => {}) })
    expect(result).toEqual(brainLayout(input))
    expect(signal?.aborted).toBe(true)
  })
  it('immediately cancels custom adapters even if they ignore abort', async () => {
    let signal: AbortSignal | undefined
    const controller = createLayoutController({ timeoutMs: 50 })
    const pending = controller.run(input, 'brain', next => { signal = next.signal; return new Promise(() => {}) })
    controller.cancel()
    expect(signal?.aborted).toBe(true)
    expect(await pending).toBeNull()
  })
  it('rejects nonfinite coordinates from a custom adapter', async () => {
    const onFallback = vi.fn()
    const result = await createLayoutController({ onFallback }).run(input, 'brain', () => ({ ...brainLayout(input), positions: { n0: [NaN, 0, 0] } }))
    expect(result).toEqual(brainLayout(input))
    expect(onFallback).toHaveBeenCalledOnce()
  })
})
