import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
describe('SSR and pure imports', () => {
  it('loads core and Forge conversion modules without browser globals', async () => { expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined'); const core = await import('../src/core/index'); const adapters = await import('../src/adapters/forge/index'); expect(typeof core.createBrainStore).toBe('function'); expect(typeof adapters.normalizeForgeResolveResponse).toBe('function') })
  it('imports and server renders the 2D React surface without eager WebGL initialization', async () => { const { BrainExplorer } = await import('../src/react'); const html = renderToString(createElement(BrainExplorer, { graph: { schemaVersion: '1', scopeKey: 's', revision: 'r', completeness: 'complete', nodes: [], edges: [] }, renderer: 'svg' })); expect(html).toContain('Brain Explorer'); expect(html).not.toContain('<canvas') })
  it('keeps core/adapters free of framework and graphics imports', () => { const root = fileURLToPath(new URL('../src', import.meta.url)); const readAll = (directory: string): string => readdirSync(directory, { withFileTypes: true }).map(entry => entry.isDirectory() ? readAll(join(directory, entry.name)) : readFileSync(join(directory, entry.name), 'utf8')).join('\n'); const pure = readAll(join(root, 'core')) + readAll(join(root, 'adapters')); expect(pure).not.toMatch(/from\s+['"](?:react|next|three|@react-three)/); expect(pure).not.toMatch(/\b(?:window|document)\./) })
})
