import type { LayoutAdapter, LayoutInput, LayoutKind, LayoutResult } from '../core/types'
import { brainLayout } from './brain-layout'
import { clusterLayout } from './cluster-layout'
export interface LayoutWorkerRequest { readonly protocol: 1; readonly requestId: number; readonly kind: LayoutKind; readonly input: Omit<LayoutInput, 'signal'> }
export interface LayoutWorkerResponse { readonly protocol: 1; readonly requestId: number; readonly result: LayoutResult }
export interface LayoutWorkerPort { postMessage(message: LayoutWorkerRequest): void; terminate(): void; onmessage: ((event: { data: LayoutWorkerResponse }) => void) | null; onerror: (() => void) | null }
export function createLayoutController(options: { workerFactory?: () => LayoutWorkerPort; timeoutMs?: number; onFallback?: () => void } = {}) {
  let generation = 0, pending: (() => void) | undefined
  return {
    async run(input: LayoutInput, kind: LayoutKind, custom?: LayoutAdapter): Promise<LayoutResult | null> {
      pending?.(); const requestId = ++generation
      const fallback = () => (kind === 'brain' ? brainLayout : clusterLayout)(input)
      if (input.signal?.aborted) return null
      if (custom) {
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
          const result = await Promise.race([Promise.resolve(custom(input)), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Layout timeout')), options.timeoutMs ?? 1500) })])
          if (requestId !== generation || input.signal?.aborted) return null
          return result.scopeKey === input.graph.scopeKey && result.revision === input.graph.revision ? result : fallback()
        } catch { if (input.signal?.aborted || requestId !== generation) return null; options.onFallback?.(); return fallback() }
        finally { clearTimeout(timer) }
      }
      if (!options.workerFactory) return fallback()
      return new Promise(resolve => {
        let worker: LayoutWorkerPort | undefined, timer: ReturnType<typeof setTimeout> | undefined, settled = false
        const finish = (result: LayoutResult | null) => {
          if (settled) return; settled = true; clearTimeout(timer); worker?.terminate(); input.signal?.removeEventListener('abort', cancel); pending = undefined
          resolve(requestId === generation && !input.signal?.aborted ? result : null)
        }
        const cancel = () => finish(null)
        const degrade = () => { if (settled) return; options.onFallback?.(); finish(fallback()) }
        pending = cancel; input.signal?.addEventListener('abort', cancel, { once: true })
        try {
          worker = options.workerFactory!()
          worker.onmessage = ({ data }) => { if (data.protocol !== 1 || data.requestId !== requestId || data.result.scopeKey !== input.graph.scopeKey || data.result.revision !== input.graph.revision) return; finish(data.result) }
          worker.onerror = degrade
          timer = setTimeout(degrade, options.timeoutMs ?? 1500)
          const { signal: _signal, ...serializable } = input
          worker.postMessage({ protocol: 1, requestId, kind, input: serializable })
        } catch { degrade() }
      })
    },
    cancel() { pending?.(); generation++ },
  }
}
