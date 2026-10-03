import type { BrainGraph } from '@encapsa-dev/brain/core'
import { Explorer } from './Explorer'
const graph: BrainGraph = { schemaVersion: '1', scopeKey: 'synthetic-next-consumer', revision: 'r1', completeness: 'complete', nodes: [{ id: 'next:document', label: 'Server-authorized document', kind: 'document', sourceNamespace: 'next-example' }], edges: [] }
export default function ConsumerPage() {
  return <main><h1>Next.js server / client boundary</h1><Explorer graph={graph} /></main>
}
