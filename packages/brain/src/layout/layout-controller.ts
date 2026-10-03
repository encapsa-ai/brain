import type { LayoutAdapter, LayoutInput, LayoutKind, LayoutResult } from '../core/types'
import { brainLayout } from './brain-layout'
import { clusterLayout } from './cluster-layout'
export interface LayoutWorkerRequest { readonly protocol: 1; readonly requestId: number; readonly kind: LayoutKind; readonly input: Omit<LayoutInput, 'signal'> }
export interface LayoutWorkerResponse { readonly protocol: 1; readonly requestId: number; readonly result: LayoutResult }
export interface LayoutWorkerPort { postMessage(message: LayoutWorkerRequest): void; terminate(): void; onmessage: ((event: { data: LayoutWorkerResponse }) => void) | null; onerror: (() => void) | null }
function isUsableResult(result: LayoutResult, input: LayoutInput): boolean {
  const finiteVector = (value: readonly number[] | undefined) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)
  return !!result && result.scopeKey === input.graph.scopeKey && result.revision === input.graph.revision
    && finiteVector(result.bounds?.min) && finiteVector(result.bounds?.max)
    && input.graph.nodes.every(node => finiteVector(result.positions?.[node.id]))
}
export function createLayoutController(options: { workerFactory?: () => LayoutWorkerPort; timeoutMs?: number; onFallback?: () => void } = {}) {
  let generation = 0, pending: (() => void) | undefined
  return {
    async run(input: LayoutInput, kind: LayoutKind, custom?: LayoutAdapter): Promise<LayoutResult | null> {
      pending?.()
      const requestId = ++generation
      const fallback = () => (kind === 'brain' ? brainLayout : clusterLayout)(input)
      if (input.signal?.aborted) return null
      if (!custom && !options.workerFactory) return fallback()
      return new Promise(resolve => {
        const controller = new AbortController()
        let worker: LayoutWorkerPort | undefined, timer: ReturnType<typeof setTimeout> | undefined, settled = false
        const finish = (result: LayoutResult | null) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          controller.abort()
          worker?.terminate()
          input.signal?.removeEventListener('abort', cancel)
          if (pending === cancel) pending = undefined
          resolve(requestId === generation && !input.signal?.aborted ? result : null)
        }
        const cancel = () => finish(null)
        const degrade = () => {
          if (settled) return
          if (input.signal?.aborted || requestId !== generation) { finish(null); return }
          options.onFallback?.()
          finish(fallback())
        }
        pending = cancel
        input.signal?.addEventListener('abort', cancel, { once: true })
        timer = setTimeout(degrade, options.timeoutMs ?? 1500)
        try {
          if (custom) {
            Promise.resolve(custom({ ...input, signal: controller.signal })).then(result => {
              if (settled) return
              if (isUsableResult(result, input)) finish(result)
              else degrade()
            }, degrade)
          } else {
            worker = options.workerFactory!()
            worker.onmessage = ({ data }) => {
              if (data?.protocol !== 1 || data.requestId !== requestId || data.result?.scopeKey !== input.graph.scopeKey || data.result.revision !== input.graph.revision) return
              if (isUsableResult(data.result, input)) finish(data.result)
              else degrade()
            }
            worker.onerror = degrade
            const { signal: _signal, ...serializable } = input
            worker.postMessage({ protocol: 1, requestId, kind, input: serializable })
          }
        } catch { degrade() }
      })
    },
    cancel() { pending?.(); generation++ },
  }
}
