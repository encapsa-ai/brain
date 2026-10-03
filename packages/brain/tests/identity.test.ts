import { describe, expect, it } from 'vitest'
import { forgeNodeId, namespacedId, parseForgeRef, safeHref, snapshotId } from '../src/core/identity'
const context = { scopeKey: 'scope:a', sourceNamespace: 'source:one', callerTenant: 'tenant_demo' }
describe('identity and reference grammar', () => {
  it('encodes namespaces without delimiter collisions', () => { expect(namespacedId('a:b', 'c', 'd')).not.toBe(namespacedId('a', 'b:c', 'd')); expect(namespacedId('a', 'one', 'same')).not.toBe(namespacedId('a', 'two', 'same')) })
  it('resolves three-segment Pack refs against explicit caller context', () => { const ref = parseForgeRef('pack://org/org_acme/brand-voice', 'tenant_demo')!; expect(ref.owner).toBe('tenant_demo'); expect(ref.version).toBeNull() })
  it('discriminates owner-qualified four-segment Pack refs', () => { const ref = parseForgeRef('pack://tenant_owner/org/org_acme/brand-voice@v14#voice', 'tenant_demo')!; expect(ref).toMatchObject({ owner: 'tenant_owner', version: 'v14', pageSlug: 'voice' }); expect(ref.resourceKey).toContain('tenant_owner') })
  it('makes equivalent local and owner-qualified refs the same resource', () => expect(forgeNodeId('pack://org/org_acme/brand-voice', context)).toBe(forgeNodeId('pack://tenant_demo/org/org_acme/brand-voice@v14', context)))
  it('keeps version identity separate and pages distinct', () => { const a = forgeNodeId('pack://org/org_acme/brand-voice#voice', context)!; expect(snapshotId(a, 'v1')).not.toBe(snapshotId(a, 'v2')); expect(a).not.toBe(forgeNodeId('pack://org/org_acme/brand-voice#terms', context)) })
  it('supports forge and tenant skill grammar without private ownership guesses', () => { expect(parseForgeRef('skill://forge/review-composer@v2', 'tenant_demo')?.owner).toBe('forge'); expect(parseForgeRef('skill://tenant/tenant_demo/review-composer@v2', 'tenant_demo')?.owner).toBe('tenant_demo'); expect(parseForgeRef('skill://private/owner/reviewer', 'tenant_demo')).toBeNull() })
  it.each(['pack://org/name', 'pack://a/b/c/d/e', 'pack://org//name', 'pack://org/id/..', 'pack://org/id/n@@v1', 'pack://org/id/%2f', 'https://not-a-pack'])('rejects malformed grammar %s', value => expect(parseForgeRef(value, 'tenant_demo')).toBeNull())
  it('never treats refs, scripts or data URLs as clickable HTTP links', () => { for (const value of ['pack://org/id/name', 'javascript:alert(1)', 'data:text/html,test', '//evil.example']) expect(safeHref(value)).toBeNull(); expect(safeHref('https://example.com/path')).toBe('https://example.com/path') })
})
