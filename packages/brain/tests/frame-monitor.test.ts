import { describe, expect, it } from 'vitest'
import { createFrameMonitor, type FrameWindow } from '../src/core/camera'

function setup() {
  const sample = createFrameMonitor()
  let time = 0
  sample(time, true)
  return {
    sample,
    window(interval: number) {
      let result: FrameWindow | null = null
      for (let i = 0; i < 90; i++) result = sample(time += interval, true)
      return result!
    },
  }
}

describe('demand-aware frame monitoring', () => {
  it('includes severe active frame times rather than filtering out stalls', () => {
    expect(setup().window(400)).toEqual({ p50Ms: 400, p95Ms: 400, slowWindows: 1 })
  })
  it('reaches the DPR and renderer fallback thresholds after sustained slow windows', () => {
    const monitor = setup()
    expect([1, 2, 3, 4].map(() => monitor.window(360).slowWindows)).toEqual([1, 2, 3, 4])
  })
  it('uses separate recovery and degradation thresholds without oscillation', () => {
    const monitor = setup()
    monitor.window(100)
    expect(monitor.window(100).slowWindows).toBe(2)
    expect(monitor.window(50).slowWindows).toBe(2)
    expect(monitor.window(16).slowWindows).toBe(1)
    expect(monitor.window(16).slowWindows).toBe(0)
  })
  it('does not interpret demand-rendering idle gaps or nonfinite timestamps as frame times', () => {
    const sample = createFrameMonitor()
    expect(sample(0, false)).toBeNull()
    expect(sample(Number.NaN, true)).toBeNull()
    expect(sample(10, true)).toBeNull()
    expect(sample(50_000, false)).toBeNull()
    expect(sample(80_000, true)).toBeNull()
    for (let i = 1; i < 90; i++) expect(sample(80_000 + i * 16, true)).toBeNull()
    expect(sample(80_000 + 90 * 16, true)).toEqual({ p50Ms: 16, p95Ms: 16, slowWindows: 0 })
  })
})
