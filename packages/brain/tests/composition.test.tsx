// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { BrainProvider, useBrain, useBrainLayout } from '../src/react/BrainProvider'
import { brainLayout } from '../src/layout/brain-layout'
import { BrainInspector } from '../src/react/components/BrainInspector'
import { BrainAccessibleList } from '../src/renderers/accessible/BrainAccessibleList'
import { BrainContextTray } from '../src/react/components/BrainContextTray'
import type { BrainGraph, LayoutInput, LayoutResult } from '../src/core/types'
const graph: BrainGraph = { schemaVersion: '1', scopeKey: 's', revision: 'r', completeness: 'complete', nodes: [{ id: 'a', label: 'Alpha', kind: 'unknown-kind', sourceNamespace: 'test', canonicalRef: 'docs:alpha' }, { id: 'b', label: 'Beta', kind: 'document', sourceNamespace: 'test', canonicalRef: 'docs:beta' }], edges: [{ id: 'ab', source: 'a', target: 'b', kind: 'references', directed: true, evidence: { origin: 'synthetic' }, metadata: { explanation: 'Explicit synthetic reference' } }] }
afterEach(cleanup)
function Probe() { const { selectedNodeId, camera } = useBrain(); return <><output data-testid="selection">{selectedNodeId ?? 'none'}</output><button onClick={() => camera.send({ type: 'rotate', yaw: 1, pitch: 0 })}>Rotate</button></> }
describe('composable React integration', () => {
  it('never reuses completed custom results for a different filtered projection', async () => {
    const requests: { input: LayoutInput; resolve: (result: LayoutResult) => void }[] = []
    const layoutAdapter = (input: LayoutInput) => new Promise<LayoutResult>(resolve => requests.push({ input, resolve }))
    function LayoutProbe() {
      const { store, filters } = useBrain()
      const layout = useBrainLayout()
      return <><output data-testid="positions">{JSON.stringify(layout.positions)}</output><button onClick={() => store.setFilters({ ...filters, query: 'Alpha' })}>Filter Alpha</button><button onClick={() => store.setFilters({ ...filters, query: '' })}>Show all</button></>
    }
    render(<BrainProvider graph={graph} layoutAdapter={layoutAdapter}><LayoutProbe /></BrainProvider>)
    await waitFor(() => expect(requests).toHaveLength(1))
    await act(async () => requests[0].resolve({ ...brainLayout(requests[0].input), positions: { a: [101, 0, 0], b: [102, 0, 0] } }))
    expect(JSON.parse(screen.getByTestId('positions').textContent!).a).toEqual([101, 0, 0])
    fireEvent.click(screen.getByRole('button', { name: 'Filter Alpha' }))
    expect(Object.keys(JSON.parse(screen.getByTestId('positions').textContent!))).toEqual(['a'])
    await waitFor(() => expect(requests).toHaveLength(2))
    await act(async () => requests[1].resolve({ ...brainLayout(requests[1].input), positions: { a: [201, 0, 0] } }))
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(Object.keys(JSON.parse(screen.getByTestId('positions').textContent!)).sort()).toEqual(['a', 'b'])
  })
  it('does not reuse a completed custom layout after changing layout, dimension or seed', async () => {
    const layoutAdapter = (input: LayoutInput): Promise<LayoutResult> => Promise.resolve({ ...brainLayout(input), positions: { a: [901, 0, input.dimensions], b: [902, 0, 0] } })
    function LayoutProbe({ dimensions }: { dimensions: 2 | 3 }) { const layout = useBrainLayout(dimensions); return <output data-testid="positions">{JSON.stringify(layout.positions)}</output> }
    const { rerender } = render(<BrainProvider graph={graph} layoutAdapter={layoutAdapter}><LayoutProbe dimensions={3} /></BrainProvider>)
    await waitFor(() => expect(JSON.parse(screen.getByTestId('positions').textContent!).a[0]).toBe(901))
    rerender(<BrainProvider graph={graph} layoutAdapter={() => new Promise(() => {})} layoutSeed="changed" view={{ renderer: 'svg', layout: 'cluster', quality: 'high' }}><LayoutProbe dimensions={2} /></BrainProvider>)
    const positions = JSON.parse(screen.getByTestId('positions').textContent!)
    expect(positions.a[0]).not.toBe(901)
    expect(positions.a[2]).toBe(0)
  })
  it('list selection opens the same canonical inspector and handles unknown kinds', () => { render(<BrainProvider graph={graph}><BrainAccessibleList /><BrainInspector renderNodeDetails={node => <p>Custom details for {node.label}</p>} /><Probe /></BrainProvider>); fireEvent.click(screen.getByRole('button', { name: /Alpha unknown-kind/ })); expect(screen.getByTestId('selection').textContent).toBe('a'); expect(screen.getByRole('heading', { name: 'Alpha' })).toBeTruthy(); expect(screen.getByText('Custom details for Alpha')).toBeTruthy(); fireEvent.click(screen.getByRole('tab', { name: /Relationships/ })); fireEvent.click(screen.getByRole('button', { name: /References · directed Beta/ })); expect(screen.getByTestId('selection').textContent).toBe('b') })
  it('implements true controlled selection', () => { const changed = vi.fn(); const { rerender } = render(<BrainProvider graph={graph} selectedNodeId={null} onSelectedNodeChange={changed}><BrainAccessibleList /><Probe /></BrainProvider>); fireEvent.click(screen.getByRole('button', { name: /Alpha unknown-kind/ })); expect(changed).toHaveBeenCalledWith('a'); expect(screen.getByTestId('selection').textContent).toBe('none'); rerender(<BrainProvider graph={graph} selectedNodeId="a" onSelectedNodeChange={changed}><BrainAccessibleList /><Probe /></BrainProvider>); expect(screen.getByTestId('selection').textContent).toBe('a') })
  it('supports a host-controlled state roundtrip', () => { function Host() { const [id, setId] = useState<string | null>(null); return <BrainProvider graph={graph} selectedNodeId={id} onSelectedNodeChange={setId}><BrainAccessibleList /><Probe /></BrainProvider> }; render(<Host />); fireEvent.click(screen.getByRole('button', { name: /Beta document/ })); expect(screen.getByTestId('selection').textContent).toBe('b') })
  it('isolates simultaneous instances and their searches', () => { render(<><section aria-label="Instance one"><BrainProvider graph={graph}><BrainAccessibleList /><Probe /></BrainProvider></section><section aria-label="Instance two"><BrainProvider graph={graph}><BrainAccessibleList /><Probe /></BrainProvider></section></>); const one = within(screen.getByRole('region', { name: 'Instance one' })), two = within(screen.getByRole('region', { name: 'Instance two' })); fireEvent.click(one.getByRole('button', { name: /Alpha unknown-kind/ })); expect(one.getByTestId('selection').textContent).toBe('a'); expect(two.getByTestId('selection').textContent).toBe('none'); fireEvent.change(one.getByRole('textbox'), { target: { value: 'Alpha' } }); expect(two.getByRole('button', { name: /Beta document/ })).toBeTruthy() })
  it('supports a local composition tray but never fabricates unsupported previews', () => { render(<BrainProvider graph={graph} defaultSelectedNodeId="a"><BrainInspector /><BrainContextTray /></BrainProvider>); fireEvent.click(screen.getByRole('button', { name: 'Add to context' })); expect((screen.getByRole('button', { name: 'Preview composition' }) as HTMLButtonElement).disabled).toBe(true); fireEvent.click(screen.getByRole('button', { name: /Context tray/ })); expect(screen.getByText(/Preview unsupported/)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha from context' })); expect(screen.getByText(/Add caller-selectable references/)).toBeTruthy() })
  it('escapes unsafe supplied text instead of interpreting markup', () => { const malicious = { ...graph, nodes: [{ ...graph.nodes[0], label: '<script>globalThis.compromised=true</script>' }] , edges: [] }; const { container } = render(<BrainProvider graph={malicious}><BrainAccessibleList /></BrainProvider>); expect(container.querySelector('script')).toBeNull(); expect(container.textContent).toContain('<script>globalThis.compromised=true</script>') })
  it('does not preserve old scoped state when providers receive a different scope', () => { const { rerender } = render(<BrainProvider graph={graph}><BrainAccessibleList /><Probe /></BrainProvider>); fireEvent.click(screen.getByRole('button', { name: /Alpha unknown-kind/ })); rerender(<BrainProvider graph={{ ...graph, scopeKey: 'another-scope', nodes: [], edges: [] }}><BrainAccessibleList /><Probe /></BrainProvider>); expect(screen.getByTestId('selection').textContent).toBe('none'); expect(screen.queryByRole('button', { name: /Alpha unknown-kind/ })).toBeNull() })
})
