import { createRoot } from 'react-dom/client'
import { BrainExplorer } from '@encapsa-dev/brain'
import { namespacedId, type BrainGraph } from '@encapsa-dev/brain/core'
import '@encapsa-dev/brain/styles.css'
const scopeKey = 'synthetic-vite-consumer', sourceNamespace = 'independent'
const nodes = ['Architecture', 'Release procedure', 'Testing guide'].map((label, i) => ({ id: namespacedId(scopeKey, sourceNamespace, String(i)), label, sourceNamespace, kind: i === 1 ? 'procedure' : 'document', version: 'v1' }))
const graph: BrainGraph = { schemaVersion: '1', scopeKey, revision: 'r1', nodes, edges: [{ id: 'explicit', source: nodes[0].id, target: nodes[1].id, kind: 'references', directed: true, evidence: { origin: 'synthetic' }, metadata: { explanation: 'An explicit synthetic reference in an independent Vite consumer.' } }], completeness: 'complete' }
createRoot(document.getElementById('root')!).render(<main><h1>Independent packed consumer</h1><p>No Next.js, Forge adapter, optional graphics peer, source alias, service, or key.</p><BrainExplorer graph={graph} renderer="svg" layout="cluster" style={{ width: '100%', height: 600 }} /></main>)
