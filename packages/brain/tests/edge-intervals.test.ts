import { describe, expect, it } from 'vitest'
import { edgeIntervals } from '../src/renderers/webgl/edge-intervals'

describe('shared WebGL edge tessellation', () => {
  it.each([0, 0.1, 1, 4, 8, 100000, NaN, Infinity, -1])('covers both endpoints continuously at length %s', length => {
    const intervals = edgeIntervals(length, false)
    expect(intervals[0][0]).toBe(0)
    expect(intervals.at(-1)![1]).toBe(1)
    expect(intervals.length).toBeLessThanOrEqual(256)
    for (let i = 1; i < intervals.length; i++) expect(intervals[i][0]).toBe(intervals[i - 1][1])
    expect(intervals.flat().every(Number.isFinite)).toBe(true)
  })
  it.each([0.1, 1, 4, 8, 12])('keeps explicit dashes short and attached at length %s', length => {
    const intervals = edgeIntervals(length, true)
    expect(intervals[0][0]).toBe(0)
    expect(intervals.at(-1)![1]).toBe(1)
    for (let i = 1; i < intervals.length; i++) expect((intervals[i][0] - intervals[i - 1][1]) * length).toBeLessThanOrEqual(0.111)
  })
  it('keeps self edges closed', () => {
    const intervals = edgeIntervals(0, false, true)
    expect(intervals).toHaveLength(64)
    expect(intervals[0][0]).toBe(0)
    expect(intervals.at(-1)![1]).toBe(1)
  })
})
