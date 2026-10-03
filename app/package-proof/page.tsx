import type { BrainGraph } from '@encapsa-dev/brain/core'
import { PackagedExplorer } from '../../apps/demo/components/PackagedExplorer'
const graph: BrainGraph = { schemaVersion: '1', scopeKey: 'synthetic-packaged-next', revision: 'r1', completeness: 'complete', nodes: [{ id: 'packaged:one', label: 'Packaged Next consumer', kind: 'document', sourceNamespace: 'package-proof' }], edges: [] }
export default function PackageProofPage() {
  return <main style={{ padding: 24 }}><h1 className="font-sans">Packaged Next.js boundary proof</h1><PackagedExplorer graph={graph} /></main>
}
