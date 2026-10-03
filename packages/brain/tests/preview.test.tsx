// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BrainPreview } from '../src/react/BrainPreview'
import { BrainExplorer } from '../src/react/BrainExplorer'
import type { BrainGraph } from '../src/core/types'

const graph: BrainGraph = { schemaVersion: '1', scopeKey: 'preview-test', revision: 'r1', completeness: 'complete', edges: [], nodes: [
  { id: 'one', label: 'Site pages', kind: 'page', sourceNamespace: 'test' },
] }
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: ResizeObserverCallback) {}
    observe() { this.callback([{ contentRect: { width: 240, height: 160 } } as ResizeObserverEntry], this as unknown as ResizeObserver) }
    disconnect() {}
  })
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe() { this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
    disconnect() {}
  })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('dashboard embedding', () => {
  it('has only an expand action, delegates navigation, and never opens fullscreen', () => {
    const onExpand = vi.fn()
    const { container } = render(<BrainPreview graph={graph} onExpand={onExpand} theme="light" />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(container.querySelector('.brain-preview-surface')?.getAttribute('aria-hidden')).toBe('true')
    expect((container.querySelector('.brain-preview-surface') as HTMLElement).inert).toBe(true)
    expect(container.querySelector('.brain-viewport')?.getAttribute('tabindex')).toBe('-1')
    expect(container.querySelector('.brain-svg-renderer text')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Expand brain' }))
    expect(onExpand).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('keeps embedded mode as a full explorer at sidebar/mobile dimensions', () => {
    const { container } = render(<BrainExplorer graph={graph} variant="embedded" renderer="svg" showContextTray={false} />)
    expect(container.querySelector('.brain-embedded')).toBeTruthy()
    expect(container.querySelector('.brain-compact')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Selected context tray' })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Search loaded context' })).toBeTruthy()
  })
})
