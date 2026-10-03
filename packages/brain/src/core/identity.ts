export function namespacedId(scopeKey: string, sourceNamespace: string, resourceKey: string): string {
  return [scopeKey, sourceNamespace, resourceKey].map(encodeURIComponent).join('::')
}
export function snapshotId(resourceId: string, version: string): string {
  return `${resourceId}::snapshot:${encodeURIComponent(version)}`
}
export interface ForgeReference {
  readonly kind: 'pack' | 'skill'
  readonly owner: string
  readonly subjectKind: string
  readonly subjectId: string
  readonly name: string
  readonly version: string | null
  readonly pageSlug: string | null
  readonly resourceKey: string
}
export function parseForgeRef(reference: string, callerTenant: string): ForgeReference | null {
  const match = /^(pack|skill):\/\/([^\s?#]+)(?:#([^\s#?]+))?$/.exec(reference)
  if (!match || !callerTenant) return null
  const kind = match[1] as 'pack' | 'skill'
  const versionParts = match[2].split('@')
  if (versionParts.length > 2 || (versionParts.length === 2 && !versionParts[1])) return null
  const parts = versionParts[0].split('/')
  if (parts.some(part => !part || part === '.' || part === '..' || /[%\\]/.test(part))) return null
  const version = versionParts[1] ?? null
  const pageSlug = match[3] ?? null
  let owner: string, subjectKind: string, subjectId: string, name: string
  if (kind === 'pack' && (parts.length === 3 || parts.length === 4)) {
    owner = parts.length === 4 ? parts[0] : callerTenant
    ;[subjectKind, subjectId, name] = parts.slice(-3)
  } else if (kind === 'skill' && parts[0] === 'forge' && parts.length === 2 && !pageSlug) {
    owner = 'forge'; subjectKind = 'skill-library'; subjectId = 'forge'; name = parts[1]
  } else if (kind === 'skill' && parts[0] === 'tenant' && parts.length === 3 && !pageSlug) {
    owner = parts[1]; subjectKind = 'skill-library'; subjectId = parts[1]; name = parts[2]
  } else return null
  const resourceKey = [kind, owner, subjectKind, subjectId, name, ...(pageSlug ? ['page', pageSlug] : [])].map(encodeURIComponent).join('/')
  return { kind, owner, subjectKind, subjectId, name, version, pageSlug, resourceKey }
}
export function forgeNodeId(reference: string, context: { scopeKey: string; sourceNamespace: string; callerTenant: string }): string | null {
  const parsed = parseForgeRef(reference, context.callerTenant)
  return parsed ? namespacedId(context.scopeKey, context.sourceNamespace, parsed.resourceKey) : null
}
export function safeHref(value: string): string | null {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}
export function stableHash(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}
