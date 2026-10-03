# @encapsa-dev/brain

A framework-independent graph projection core, React explorer, and optional 3D knowledge visualization. First working release candidate, **not published**. All demo data is fictional. This package is a viewer, not a graph database, inference engine, authorization layer, or Forge client.

## Entry points

| Entry | Purpose |
| --- | --- |
| `@encapsa-dev/brain` | Batteries-included React explorer; no eager graphics import |
| `@encapsa-dev/brain/core` | Types, validation, identity, indexing, hierarchy, projection, layout, store, evidence matching |
| `@encapsa-dev/brain/react` | Composable provider, hooks and UI components; 2D/list need no graphics packages |
| `@encapsa-dev/brain/webgl` | Optional R3F/Three renderer |
| `@encapsa-dev/brain/adapters/forge` | Pure catalog, resolve, generation, internal receipt adapters and Forge preset |
| `@encapsa-dev/brain/styles.css` | Explicit, scoped CSS; no global reset or body changes |
| `@encapsa-dev/brain/layout-worker` | Optional worker module; host owns Worker construction and bundler URL |

ESM, strict TypeScript declarations. Tested with React/React DOM 19.2.4, Fiber 9.8.1, Three 0.186.1, TypeScript 5.7.3, Node 24.16.0. React 18 compatibility is **not** claimed. React is a peer, and Three/Fiber peers are optional. No Next.js, Tailwind, shadcn, network service or key is required by the package.

## Basic 2D or accessible use

```tsx
import { BrainExplorer } from '@encapsa-dev/brain'
import type { BrainGraph } from '@encapsa-dev/brain/core'
import '@encapsa-dev/brain/styles.css'

export function Knowledge({ graph }: { graph: BrainGraph }) {
  return <BrainExplorer graph={graph} renderer="svg" layout="cluster"
    style={{ width: '100%', height: 420 }} />
}
```

`renderer`/`layout` initialize the standalone explorer. For controlled ongoing view state use `view` and `onViewChange`. A standalone 2D build does not import or resolve the optional graphics packages. `auto` without a registered 3D renderer is a usable 2D viewer; selecting 3D explains the unsupported capability.

## Opt into 3D explicitly

Install compatible `three` and `@react-three/fiber` peers in your host; `@types/three` is needed only when developing a typed 3D host. Register the loader **outside** component render so its identity is stable:

```tsx
import { BrainExplorer } from '@encapsa-dev/brain'
import type { BrainGraph } from '@encapsa-dev/brain/core'
import '@encapsa-dev/brain/styles.css'

const loadWebGLRenderer = () => import('@encapsa-dev/brain/webgl')
export function Knowledge({ graph }: { graph: BrainGraph }) {
  return <BrainExplorer graph={graph} renderer="auto" layout="brain"
    loadWebGLRenderer={loadWebGLRenderer} motion="system" autoFocus
    nodeSize={{ metric: 'targetTokens', scale: 'sqrt', min: 4, max: 10, unknown: 3 }} />
}
```

Explicit registration is intentional: bundlers otherwise resolve a supposedly optional dynamic import even in a 2D-only consumer. The working demo registers this loader, and the clean Vite consumer deliberately does not.

## Composable equivalent

```tsx
import { BrainProvider, BrainToolbar, BrainTierNavigator, BrainViewport,
  BrainInspector, BrainLegend, BrainAccessibleList } from '@encapsa-dev/brain/react'
import { forgePreset } from '@encapsa-dev/brain/adapters/forge'

<BrainProvider graph={authorizedGraph} preset={forgePreset}>
  <div className="brain-explorer" style={{ height: 640 }}>
    <BrainToolbar />
    <BrainTierNavigator />
    <BrainViewport renderer="svg" layout="cluster" />
    <BrainInspector renderNodeDetails={node => <p>{node.label}</p>} />
    <BrainLegend />
    <BrainAccessibleList />
  </div>
</BrainProvider>
```

The `.brain-explorer` wrapper supplies the scoped CSS tokens; compose layout with your own CSS. `BrainExplorerShell` provides the demonstrated layout for an existing provider. Each provider creates an independent store, camera bus and pending-work lifetime.

### Selection, groups, filters, view and controller

- Uncontrolled: `defaultSelectedNodeId`, `defaultExpandedGroups`, `defaultView`.
- Controlled: `selectedNodeId` / `onSelectedNodeChange`, `expandedGroups` / `onExpandedGroupsChange`, `filters` / `onFiltersChange`, `view` / `onViewChange`. The host must confirm changes to controlled values.
- `BrainFilters`: `{ query, kinds, neighborhood: 0 | 1 | 2, groupId }`. Query searches only safe labels and supplied refs. An empty `kinds` list means all kinds.
- Explorer `ref`: `{ focusNode(id), fit(), resetCamera(), rotate(yawRadians, pitchRadians) }`.
- `useBrain()` exposes the current snapshot, index, hierarchy, presentation projection, typed store and camera bus. Frame updates stay renderer-owned, outside React interaction state.
- Known selected IDs survive same-scope immutable updates. Removed/unavailable selections get a clear empty inspector, not an invented authorization explanation. Scope changes remount the provider's private state boundary.

### Extension points

`BrainPreset` supports custom node/edge registries, glyphs, shape/color tokens, an explicit hierarchy or ordered `TierDefinition[]` grouping functions with minimum visibility levels. `flatPreset` makes no Forge assumptions. `nodeStyleResolver` / `edgeStyleResolver` are renderer-neutral. `renderExtraWebGL` is a renderer-specific React/R3F extension. `renderNodeDetails` / `renderNodeActions` customize the inspector.

`loadingSlot`, `emptySlot`, `errorSlot`, `unsupportedSlot` replace status views. `toolbarStart`, `toolbarEnd`, `children` and `receiptControls` compose host chrome without portals outside fullscreen.

`layoutAdapter(input)` accepts graph scope/revision, seed, dimensions, previous positions and an AbortSignal. The controller bounds completion at 1.5 seconds; cancellation and stale worker responses are discarded. `layoutWorkerFactory` accepts a Worker-compatible port and protocol-1 messages. The shipped deterministic layouts are linear, bounded algorithms, not unbounded force simulations.

### Sizes and metric semantics

```tsx
<BrainExplorer graph={graph} renderer="svg" style={{ width: 320, height: 240 }} />
<BrainExplorer graph={graph} renderer="svg" style={{ width: 640, height: 420 }} />
<BrainExplorer graph={graph} renderer="svg"
  style={{ width: '100%', height: 'auto', aspectRatio: '16 / 9' }} />
```

Container ResizeObserver handles hidden/zero size. Compact embeds retain visualization, selection, camera controls and an expanded explorer action. Node radii are clamped; missing metrics use a separate unknown size. `loadedDegree` means unique incident edges, incoming and outgoing, across all edge kinds **within the loaded graph**, never semantic importance.

## Host security boundary

Pass only an already-authorized, allowlisted `BrainGraph`. Labels, counts, hashes, refs, grants, edges and timestamps may themselves be sensitive. UI filtering is not authorization. Graphs have an opaque `scopeKey`; source namespaces and resource keys establish identity independently of label, hash or version. `snapshotId` creates explicit history identities. `composeGraphs` requires one common host-authorized scope and distinct namespaced IDs.

`BrainDataSource` is optional: `loadGraph({scopeKey,cursor,signal})`, `loadDetails({scopeKey,nodeId,graphRevision,signal})`, and optional `subscribe({scopeKey,onRevision}) => unsubscribe`. Trigger `store.loadGraph(...)` from a host data layer or event handler. Live subscriptions supply monotonic sequence numbers. The store checks generations, scope, revision and node identity in addition to AbortSignal.

`AuthorizedNodeDetails` contains scope/revision/node identity, primitive labeled fields, optional explicitly authorized text and safe evidence pointers. Text is escaped; there is no HTML/Markdown/remote-image renderer. Use `safeHref` only for host-authorized HTTP(S) links. Forge refs are identifiers, not fetchable URLs.

A host may throw `BrainDataError('authorization' | 'scope' | 'unavailable')`. Authorization/scope failures clear data, details, observations, selection, queries and pending work, with no alternate-source retry. Generic detail-loading failures expose a bounded unavailable state without raw error content.

## Composition and observations

The tray is intentionally local, in-memory UI state. Reordering changes display order only. `onPreview(refs)` is a host callback; absent callbacks are visibly unsupported, never fake successes. The demo provides a deterministic synthetic callback and marks its results **Simulated**. The library never calls Forge or an LLM.

Three separate Forge converters:

- `normalizeForgeResolveResponse(response, context)`: top-level resolved refs/pages and drops. Compiled prompts are never copied. Missing per-section redaction and tokens stay null.
- `normalizeForgeGenerationReceipt(context_receipt, context)`: aggregate accounting, hashes, optional parameter digest, timestamp, and drops only. Requested refs are host-supplied, not proof of inclusion.
- `normalizeForgeInternalReceipt(receipt, context)`: an **explicit host projection**, not a public API payload. Kept and dropped sections map independently by version and page identity; only explicit internal fields establish redaction/inclusion.

`HostPackProjection`/`HostSkillProjection` are documented host projections, **not invented public wire DTOs**. The quoted `TokenBudget` representation is not known, so it stays opaque and the host may separately project `targetTokens`. Pack summaries alone never create pages or references. Activation refs are declarations, not observed traversal. PHI-marked is not redacted. Unknown custom kinds and redactor engines remain intact.

`matchObservation` rejects wrong scopes and unknown/mismatched versions or hashes. It can match a historical snapshot only when explicitly supplied as that version. Aggregate token null stays unknown; deferred accounting is displayed. A failure carries no successful partial result. The illustrative pipeline is manually stepped and never claims chronological execution or timing.

## Rendering behavior and limits

WebGL uses instanced node geometries, batched edge lines, focused directed arrowheads, bounded projected labels and an original procedural bilateral envelope. No downloaded model, font, texture, telemetry SDK or perpetual animation. Auto-rotate starts off and any interaction pauses it. Rendering rests on demand. DPR is bounded; sustained slow-frame windows degrade quality and eventually offer a 2D downgrade with explicit retry. Hidden/unmounted instances stop work and clean up buffers, observers, controls and pending requests.

The SVG tier has deterministic pan/pinch/wheel zoom, directional edges, selection and the same inspector. The list tier paginates canonical entities (60/page) rather than dropping them. Rendering only focused edges on large projections is disclosed. At 5,000 nodes the demo starts aggregated by region; expanding every group is possible but no unlimited-scale guarantee is made.

Native fullscreen is attempted only on activation. Rejection/unsupported environments get an explicitly labeled **expanded overlay**. Exit restores scroll and focus, and the canvas stays mounted so camera state survives. Camera and list selection work with reduced motion and keyboard navigation.

## Development and release

From the repository: `pnpm install`, `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:browser`, `pnpm build`, `pnpm verify:consumer`. The demo route is `/`; v0 serves it automatically. `examples/vite-react` installs the packed tarball; `examples/next-consumer` shows the client/server boundary. See repository `docs/verification.md` for checks actually performed, and `docs/decisions.md` for design choices and revisit triggers.

No npm publish, production deployment, real Forge calls, new authorization policies, public repository creation or production environment changes are included. License is deliberately **UNLICENSED pending operator review**; MIT is recommended, not asserted approved. Confirm namespace ownership, package availability, public repository destination and license/assets before any public release.
