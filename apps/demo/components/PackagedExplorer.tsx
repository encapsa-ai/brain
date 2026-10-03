'use client'
import { BrainExplorer } from '@encapsa-dev/brain/react'
import type { BrainGraph } from '@encapsa-dev/brain/core'
import '@encapsa-dev/brain/styles.css'
export function PackagedExplorer({ graph }: { graph: BrainGraph }) {
  return <BrainExplorer graph={graph} renderer="svg" style={{ width: '100%', height: 500 }} />
}
