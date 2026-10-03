'use client'
import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { brainSurface } from '../../layout/brain-layout'
export function BrainEnvelope({ quality, color }: { quality: 'high' | 'low'; color: string }) {
  const geometries = useMemo(() => {
    const points: number[] = [], colors: number[] = [], lines: number[] = []
    const rows = quality === 'high' ? 70 : 40, columns = quality === 'high' ? 112 : 64
    const tint = new Color(color)
    for (const side of [-1, 1] as const) {
      for (let row = 1; row < rows; row++) for (let col = 0; col < columns; col++) {
        const u = col / columns * Math.PI * 2, v = row / rows * Math.PI
        const point = brainSurface(u, v, side)
        points.push(...point)
        const brightness = 0.48 + 0.26 * (Math.sin(u * 5 + v * 2) * 0.5 + 0.5)
        colors.push(tint.r * brightness, tint.g * brightness, tint.b * brightness)
      }
      for (let row = 1; row < 24; row++) for (let col = 0; col < 100; col++) {
        const v = row / 24 * Math.PI, u = col / 100 * Math.PI * 2
        lines.push(...brainSurface(u, v, side), ...brainSurface((col + 1) / 100 * Math.PI * 2, v, side))
      }
      for (let col = 0; col < 34; col++) for (let row = 1; row < 65; row++) {
        const u = col / 34 * Math.PI * 2
        lines.push(...brainSurface(u, row / 66 * Math.PI, side), ...brainSurface(u, (row + 1) / 66 * Math.PI, side))
      }
    }
    const pointGeometry = new BufferGeometry(), lineGeometry = new BufferGeometry()
    pointGeometry.setAttribute('position', new Float32BufferAttribute(points, 3)); pointGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    lineGeometry.setAttribute('position', new Float32BufferAttribute(lines, 3))
    return { pointGeometry, lineGeometry }
  }, [quality, color])
  useEffect(() => () => { geometries.pointGeometry.dispose(); geometries.lineGeometry.dispose() }, [geometries])
  return <group>
    <points geometry={geometries.pointGeometry} raycast={() => null}><pointsMaterial size={quality === 'high' ? 0.013 : 0.02} vertexColors transparent opacity={0.68} sizeAttenuation depthWrite={false} toneMapped={false} /></points>
    <lineSegments geometry={geometries.lineGeometry} raycast={() => null}><lineBasicMaterial color={color} transparent opacity={0.10} depthWrite={false} toneMapped={false} /></lineSegments>
  </group>
}
