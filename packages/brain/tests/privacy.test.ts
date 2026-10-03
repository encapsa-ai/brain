import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { acmeGraph } from '../../../apps/demo/fixtures/acme'
import { createEngineeringGraph, createStressGraph } from '../../../apps/demo/fixtures/generic'
import { safeHref } from '../src/core/identity'
function sourceText(directory: string): string { return readdirSync(directory, { withFileTypes: true }).map(entry => entry.isDirectory() ? sourceText(join(directory, entry.name)) : /\.[cm]?[jt]sx?$/.test(entry.name) ? readFileSync(join(directory, entry.name), 'utf8') : '').join('\n') }
describe('privacy boundaries', () => {
  it('contains no fixture bodies, credentials, real patients or compiled prompts', () => { for (const graph of [acmeGraph, createEngineeringGraph(), createStressGraph(100)]) { const serialized = JSON.stringify(graph); expect(serialized).not.toMatch(/"(?:body|compiled_prompt|api_key|password|authorization|patient_name|patient_id|secret)"\s*:/i); expect(graph.nodes.every(node => node.metadata && typeof node.metadata === 'object' && 'synthetic' in node.metadata && node.metadata.synthetic === true)).toBe(true) } })
  it('PHI flags are metadata only and never silently become redaction evidence', () => { const node = acmeGraph.nodes.find(node => node.kind === 'page' && node.label === 'PHI-marked metadata')!; expect(node).toBeTruthy(); expect(node.metadata).toMatchObject({ containsPhi: true }); expect(JSON.stringify(node)).not.toContain('redactionApplied') })
  it('contains no content-bearing logs, storage cache or analytics implementation', () => { const code = sourceText(fileURLToPath(new URL('../src', import.meta.url))); expect(code).not.toMatch(/console\.(?:log|error|warn|debug|info)\s*\(/); expect(code).not.toMatch(/\b(?:localStorage|indexedDB|sessionStorage)\b/); expect(code).not.toMatch(/dangerouslySetInnerHTML|@vercel\/analytics|JSON\.stringify\(.*(?:graph|metadata)/) })
  it('forbids unsafe schemes and never renders Markdown as HTML', () => { for (const href of ['javascript:alert(1)', 'data:image/svg+xml,test', 'file:///etc/passwd', 'pack://org/id/name']) expect(safeHref(href)).toBeNull() })
  it('stress edge generation remains bounded with explicit totals', () => { for (const count of [100, 1000, 5000] as const) { const graph = createStressGraph(count); expect(graph.nodes).toHaveLength(count); expect(graph.edges.length).toBeLessThan(count * 2); expect(graph.completeness).toBe('complete') } })
})
