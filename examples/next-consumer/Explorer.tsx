'use client'
import { BrainExplorer } from '@encapsa-dev/brain/react'
import type { BrainGraph } from '@encapsa-dev/brain/core'
import '@encapsa-dev/brain/styles.css'
export function Explorer({ graph }: { graph: BrainGraph }) {
  return <BrainExplorer graph={graph} renderer="svg" style={{ height: 420 }} />
}
