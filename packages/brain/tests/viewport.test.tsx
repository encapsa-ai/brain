// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { BrainProvider } from '../src/react/BrainProvider'
import { BrainViewport } from '../src/react/components/BrainViewport'
import type { BrainGraph } from '../src/core/types'

const emptyGraph: BrainGraph = { schemaVersion: '1', scopeKey: 'synthetic-test', revision: 'r1', completeness: 'complete', nodes: [], edges: [] }
const invalidGraph: BrainGraph = { ...emptyGraph, edges: [{ id: 'invalid', source: 'missing', target: 'missing', kind: 'references', directed: true, evidence: { origin: 'synthetic' } }] }

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('ResizeObserver', class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe() { this.callback([{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry], this as unknown as ResizeObserver) }
    disconnect() {}
  })
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe() { this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
    disconnect() {}
  })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('renderer initialization lifecycle', () => {
  it.each([
    { graph: emptyGraph, heading: 'No loaded context to display' },
    { graph: invalidGraph, heading: 'Data unavailable' },
  ])('does not start a WebGL deadline while showing $heading', async ({ graph, heading }) => {
    const onDiagnostic = vi.fn()
    const loadWebGLRenderer = vi.fn(() => new Promise<never>(() => {}))
    render(<BrainProvider graph={graph} loadWebGLRenderer={loadWebGLRenderer} onDiagnostic={onDiagnostic}><BrainViewport renderer="webgl" /></BrainProvider>)
    expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    await act(async () => vi.advanceTimersByTime(7000))
    expect(loadWebGLRenderer).not.toHaveBeenCalled()
    expect(onDiagnostic.mock.calls.some(([event]) => event.category === 'renderer-fallback')).toBe(false)
  })
})
