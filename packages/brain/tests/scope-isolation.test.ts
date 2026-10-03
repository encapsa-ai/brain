import { describe, expect, it, vi } from 'vitest'
import { BrainDataError, createBrainStore } from '../src/core/store'
import type { AuthorizedNodeDetails, BrainGraph } from '../src/core/types'
const graph: BrainGraph = { schemaVersion: '1', scopeKey: 'a', revision: 'r1', completeness: 'complete', nodes: [{ id: 'a:node', label: 'Authorized A', kind: 'document', sourceNamespace: 's', canonicalRef: 'docs:a' }], edges: [] }
const other: BrainGraph = { ...graph, scopeKey: 'b', revision: 'r2', nodes: [{ ...graph.nodes[0], id: 'b:node', label: 'Authorized B' }] }
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
describe('security context boundaries', () => {
  it('discards late details even when the host ignores abort', async () => { let finish!: (value: AuthorizedNodeDetails) => void; const store = createBrainStore(graph, { onRequestDetails: () => new Promise(resolve => { finish = resolve }) }); store.select('a:node'); store.addToTray('a:node'); store.setFilters({ query: 'Authorized A', kinds: ['document'], neighborhood: 1, groupId: null }); store.replaceGraph(other); finish({ scopeKey: 'a', graphRevision: 'r1', nodeId: 'a:node', fields: [{ label: 'Secret old-scope metadata', value: 'not allowed now' }] }); await flush(); expect(store.getSnapshot().selectedNodeId).toBeNull(); expect(store.getSnapshot().tray).toEqual([]); expect(store.getSnapshot().filters.query).toBe(''); expect(store.getSnapshot().details.status).toBe('idle'); expect(JSON.stringify(store.getSnapshot())).not.toContain('Secret old-scope'); store.dispose() })
  it('drops details after selection navigation and revision changes', async () => { let finish!: (value: AuthorizedNodeDetails) => void; const store = createBrainStore(graph, { onRequestDetails: () => new Promise(resolve => { finish = resolve }) }); store.select('a:node'); store.replaceGraph({ ...graph, revision: 'r2' }); finish({ scopeKey: 'a', graphRevision: 'r1', nodeId: 'a:node', fields: [{ label: 'Stale', value: true }] }); await flush(); expect(store.getSnapshot().details.status).toBe('idle') })
  it('clears loaded graph on an explicit authorization failure', async () => { const store = createBrainStore(graph, { onRequestDetails: async () => { throw new BrainDataError('authorization') } }); store.select('a:node'); await flush(); expect(store.getSnapshot().dataStatus).toBe('unavailable'); expect(store.getSnapshot().graph.nodes).toEqual([]); expect(store.getSnapshot().selectedNodeId).toBeNull() })
  it('clears data on a detail response scope mismatch', async () => { const store = createBrainStore(graph, { onRequestDetails: async () => ({ scopeKey: 'b', graphRevision: 'r1', nodeId: 'a:node', fields: [] }) }); store.select('a:node'); await flush(); expect(store.getSnapshot().dataStatus).toBe('unavailable'); expect(store.getSnapshot().graph.nodes).toHaveLength(0) })
  it('retains stable selection on immutable updates and shows unavailable IDs after removal', () => { const store = createBrainStore(graph); store.select('a:node'); store.replaceGraph({ ...graph, nodes: graph.nodes.map(node => ({ ...node, label: 'Updated label' })) }); expect(store.getSnapshot().selectedNodeId).toBe('a:node'); store.replaceGraph({ ...graph, revision: 'removed', nodes: [] }); expect(store.getSnapshot().selectedNodeId).toBe('a:node'); expect(store.getSnapshot().graph.nodes).toHaveLength(0) })
  it('does not apply late graph loads after a scope switch', async () => { let finish!: (graph: BrainGraph) => void; const store = createBrainStore(graph); const pending = store.loadGraph({ loadGraph: () => new Promise(resolve => { finish = resolve }) }, 'a'); store.replaceGraph(other); finish(graph); await pending; expect(store.getSnapshot().graph.scopeKey).toBe('b') })
  it('fails closed on load rejection and never tries another source', async () => { const loadGraph = vi.fn(async () => { throw new Error('RAW_CONTENT_SHOULD_NOT_LEAK') }); const store = createBrainStore(graph); await store.loadGraph({ loadGraph }, 'a'); expect(loadGraph).toHaveBeenCalledOnce(); expect(store.getSnapshot().graph.nodes).toHaveLength(0); expect(JSON.stringify(store.getSnapshot())).not.toContain('RAW_CONTENT') })
  it('orders live revisions and unsubscribes on scope change', async () => { let emit!: (graph: BrainGraph, sequence: number) => void; const unsubscribe = vi.fn(); const store = createBrainStore(graph); await store.loadGraph({ loadGraph: async () => graph, subscribe(input) { emit = input.onRevision; return unsubscribe } }, 'a'); emit({ ...graph, revision: 'newest' }, 3); emit({ ...graph, revision: 'old' }, 2); expect(store.getSnapshot().graph.revision).toBe('newest'); store.replaceGraph(other); expect(unsubscribe).toHaveBeenCalledOnce(); emit(graph, 4); expect(store.getSnapshot().graph.scopeKey).toBe('b') })
  it('validates invalid projections before exposing any entity', () => { const store = createBrainStore({ ...graph, nodes: [...graph.nodes, ...graph.nodes] }); expect(store.getSnapshot().dataStatus).toBe('unavailable'); expect(store.getSnapshot().graph.nodes).toEqual([]) })
  it('clears composition on scope changes even when the new host reuses IDs', () => {
    const store = createBrainStore(graph)
    store.addToTray('a:node')
    store.replaceGraph({ ...graph, scopeKey: 'b', revision: 'r2' })
    expect(store.getSnapshot().tray).toEqual([])
    store.dispose()
  })
  it('does not let a pending source replace a newer directly supplied revision', async () => {
    let finish!: (value: BrainGraph) => void
    const store = createBrainStore(graph)
    const pending = store.loadGraph({ loadGraph: () => new Promise(resolve => { finish = resolve }) }, 'a')
    store.replaceGraph({ ...graph, revision: 'newer' })
    finish(graph)
    await pending
    expect(store.getSnapshot().graph.revision).toBe('newer')
    store.dispose()
  })
  it('invalidates live subscriptions when a host supplies a replacement snapshot', async () => {
    let emit!: (value: BrainGraph, sequence: number) => void
    const unsubscribe = vi.fn(), store = createBrainStore(graph)
    await store.loadGraph({ loadGraph: async () => graph, subscribe(input) { emit = input.onRevision; return unsubscribe } }, 'a')
    store.replaceGraph({ ...graph, revision: 'host-replacement' })
    emit({ ...graph, revision: 'late-subscription' }, 1)
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(store.getSnapshot().graph.revision).toBe('host-replacement')
    store.dispose()
  })
  it('does not subscribe after a source returns an invalid projection', async () => {
    const subscribe = vi.fn(() => vi.fn()), store = createBrainStore(graph)
    await store.loadGraph({ loadGraph: async () => ({ ...graph, nodes: [...graph.nodes, ...graph.nodes] }), subscribe }, 'a')
    expect(store.getSnapshot().dataStatus).toBe('unavailable')
    expect(subscribe).not.toHaveBeenCalled()
    store.dispose()
  })
  it('keeps controlled mutations with the host until confirmed', () => { const change = vi.fn(), store = createBrainStore(graph, { selectedNodeId: null, onSelectedNodeChange: change }); store.select('a:node'); expect(change).toHaveBeenCalledWith('a:node'); expect(store.getSnapshot().selectedNodeId).toBeNull(); store.select('a:node', true); expect(store.getSnapshot().selectedNodeId).toBe('a:node') })
})
