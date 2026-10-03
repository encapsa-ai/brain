import { brainLayout } from './brain-layout'
import { clusterLayout } from './cluster-layout'
import type { LayoutWorkerRequest, LayoutWorkerResponse } from './layout-controller'
const worker = globalThis as unknown as { onmessage: ((event: { data: LayoutWorkerRequest }) => void) | null; postMessage: (message: LayoutWorkerResponse) => void }
worker.onmessage = ({ data }) => {
  if (data.protocol !== 1) return
  const result = (data.kind === 'brain' ? brainLayout : clusterLayout)(data.input)
  worker.postMessage({ protocol: 1, requestId: data.requestId, result })
}
