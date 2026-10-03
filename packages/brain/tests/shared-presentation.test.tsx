// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrainProvider, useBrain } from '../src/react/BrainProvider'
import { BrainInspector } from '../src/react/components/BrainInspector'
import { BrainCopyField, BrainConnectionPicker } from '../src/react/components/BrainFieldControls'
import { BrainKindFilters } from '../src/react/components/BrainTierNavigator'
import type { BrainGraph, BrainPreset } from '../src/core/types'
const graph: BrainGraph = { schemaVersion: '1', scopeKey: 'test', revision: 'v1', completeness: 'partial', nodes: [
  { id: 'a', label: 'Alpha', kind: 'page', sourceNamespace: 'test', metadata: { evidence: 'documents.section.full_field', provenance: 'Saved documents' } },
  { id: 'b', label: 'Beta', kind: 'page', sourceNamespace: 'test' },
], edges: [{ id: 'ab', source: 'a', target: 'b', kind: 'references', directed: true, evidence: { origin: 'synthetic' } }] }
const preset: BrainPreset = { id: 'dashes', edgeKinds: { references: { label: 'References', color: '#334455', dashed: true } } }
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function Probe() { const { filters, edgeStyle } = useBrain(); return <><output data-testid="pattern">{String(edgeStyle(graph.edges[0]).dashed)}</output><output data-testid="filter">{filters.neighborhood}</output></> }
it('defaults every host to continuous edges and supports an explicit patterned opt-in', () => {
  const { rerender } = render(<BrainProvider graph={graph} preset={preset}><Probe /></BrainProvider>)
  expect(screen.getByTestId('pattern').textContent).toBe('false')
  rerender(<BrainProvider graph={graph} preset={preset} edgePattern="declared"><Probe /></BrainProvider>)
  expect(screen.getByTestId('pattern').textContent).toBe('true')
})
it.each([undefined, '', 'Unknown', 'Version unknown'])('hides unavailable version %s, completeness, footer and path controls by default', version => {
  render(<BrainProvider graph={{ ...graph, nodes: [{ ...graph.nodes[0], version }, graph.nodes[1]] }} defaultSelectedNodeId="a"><BrainInspector /></BrainProvider>)
  expect(screen.queryByText('Version')).toBeNull()
  expect(screen.queryByText('Completeness')).toBeNull()
  expect(screen.queryByText('Provenance')).toBeNull()
  expect(screen.getByText('Source')).toBeTruthy()
  expect(screen.queryByText('Metadata only · authorized projection')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: /Relationships/ }))
  expect(screen.queryByLabelText('Directed path to another entity')).toBeNull()
})
it('shows real versions and allows hosts to customize labels', () => {
  render(<BrainProvider graph={{ ...graph, nodes: [{ ...graph.nodes[0], version: 'v3' }, graph.nodes[1]] }} defaultSelectedNodeId="a"><BrainInspector inspectorOptions={{ labels: { source: 'Origin' } }} /></BrainProvider>)
  expect(screen.getAllByText('v3')).toHaveLength(2)
  expect(screen.getByText('Version')).toBeTruthy()
  expect(screen.getByText('Origin')).toBeTruthy()
})
it('retains the working directed-path feature behind a shared option', () => {
  render(<BrainProvider graph={graph} defaultSelectedNodeId="a"><BrainInspector inspectorOptions={{ showDirectedPaths: true }} /></BrainProvider>)
  fireEvent.click(screen.getByRole('tab', { name: /Relationships/ }))
  fireEvent.change(screen.getByLabelText('Directed path to another entity'), { target: { value: 'b' } })
  fireEvent.click(screen.getByRole('button', { name: 'Find loaded path' }))
  expect(screen.getByText(/1 explicit directed edge: Alpha → Beta/)).toBeTruthy()
})
it('counts unique relationships instead of double-counting self edges', () => {
  render(<BrainProvider graph={{ ...graph, edges: [...graph.edges, { ...graph.edges[0], id: 'self', target: 'a' }] }} defaultSelectedNodeId="a"><BrainInspector /></BrainProvider>)
  expect(screen.getByLabelText('2 relationships').textContent).toBe('2')
})
it('supports keyboard connection selection through the shared picker', async () => {
  render(<BrainProvider graph={graph} defaultSelectedNodeId="a"><BrainConnectionPicker /><Probe /></BrainProvider>)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Connections: All items' }), { key: 'ArrowDown' })
  await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'All items' })).toBe(document.activeElement))
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Direct connections' }))
  expect(screen.getByTestId('filter').textContent).toBe('1')
  expect(screen.getByRole('button', { name: 'Connections: Direct connections' })).toBe(document.activeElement)
})
it('disables connection narrowing when no node is selected', () => {
  render(<BrainProvider graph={graph}><BrainConnectionPicker /></BrainProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Connections: All items' }))
  expect((screen.getByRole('menuitemradio', { name: 'Direct connections' }) as HTMLButtonElement).disabled).toBe(true)
})
it('keeps picker portals inside a nested host dialog rather than outside its focus boundary', () => {
  render(<div className="brain-explorer"><div role="dialog" aria-label="Host drawer"><BrainProvider graph={graph} defaultSelectedNodeId="a"><BrainConnectionPicker /></BrainProvider></div></div>)
  fireEvent.click(screen.getByRole('button', { name: 'Connections: All items' }))
  expect(screen.getByRole('menu').closest('[role="dialog"]')).toBe(screen.getByRole('dialog', { name: 'Host drawer' }))
})
it('exports reusable kind filters with configurable terminology', () => {
  render(<BrainProvider graph={graph}><BrainKindFilters label="Record types" kindLabels={{ page: 'Documents' }} /></BrainProvider>)
  expect(screen.getByText('Record types')).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: /Documents/ })).toBeTruthy()
})
it('copies a full source field and exposes it on keyboard focus', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  const text = 'long.'.repeat(80)
  render(<BrainCopyField value={text} />)
  const button = screen.getByRole('button')
  fireEvent.focus(button)
  expect(screen.getByRole('tooltip').textContent).toContain(text)
  fireEvent.click(button)
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(text))
  expect(screen.getByRole('status').textContent).toBe('Copied')
})
it('does not report a successful copy when clipboard access is denied', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
  render(<BrainCopyField value="private.field" />)
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Copy unavailable/))
})
it('ignores a late copy result after the field changes', async () => {
  let finish!: () => void
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise<void>(resolve => { finish = resolve }) } })
  const { rerender } = render(<BrainCopyField value="old.field" />)
  fireEvent.click(screen.getByRole('button'))
  rerender(<BrainCopyField value="new.field" />)
  await act(async () => finish())
  expect(screen.queryByText('Copied')).toBeNull()
  expect(screen.getByRole('button').textContent).toBe('new.field')
})
