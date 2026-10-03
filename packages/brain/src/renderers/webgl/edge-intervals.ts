/**
 * Parameter intervals for a complete edge or an explicitly requested dash
 * pattern. Never omit either endpoint. Subdivision scales with world length,
 * not a fixed eight pieces that severed long connectors into floating strokes.
 */
export function edgeIntervals(length: number, dashed: boolean, self = false): readonly (readonly [number, number])[] {
  const safeLength = Number.isFinite(length) && length >= 0 ? length : 0
  const segments = self ? 64 : Math.max(24, Math.min(256, Math.ceil(safeLength / 0.055)))
  const intervals: [number, number][] = []
  for (let i = 0; i < segments; i++) {
    if (dashed && i > 0 && i < segments - 1 && Math.floor(i / 2) % 2 === 1) continue
    intervals.push([i / segments, (i + 1) / segments])
  }
  return intervals
}
