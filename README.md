# @encapsa-dev/brain

<img width="100%" alt="Encapsa Brain Visualization" src="https://github.com/user-attachments/assets/b895d24a-6f28-4b58-82d5-7a34d3131c77" />

**Make connected knowledge explorable.** Encapsa Brain is an open-source React and TypeScript visualization library for knowledge graphs, AI context, documentation networks, and application dashboards. Use an interactive 3D brain, a lightweight 2D graph, or a keyboard-accessible list with a shared selection and inspection model.

Built by [Encapsa AI](https://encapsa.ai). Your application supplies the data; the library supplies exploration, not a database, an LLM, or an authorization service.

[Interactive demo](https://brain-two-lake.vercel.app) · [npm package](https://www.npmjs.com/package/@encapsa-dev/brain) · [GitHub](https://github.com/encapsa-ai/brain) · [Issues](https://github.com/encapsa-ai/brain/issues)

## Why Encapsa Brain?

- **A brain you can explore:** Drag to orbit, rotate with buttons, zoom, select nodes, inspect details, and follow explicit relationships.
- **Small preview, full explorer:** Embed a non-interactive overview with one Expand action, then let your host open a tab, panel, or full explorer.
- **Composable context:** Group entities into configurable tiers, collapse regions, and distinguish factual context, procedures, and request observations.
- **Progressive rendering:** Explicitly opt into WebGL. Use SVG or the accessible list without installing Three.js or React Three Fiber.
- **A library, not a framework:** Framework-independent graph utilities, typed React components, optional Forge adapters, scoped CSS, and no Next.js or Tailwind requirement.
- **Your data stays under your control:** No built-in fetching, telemetry, storage, API keys, or AI calls. Pass only data your host has authorized.

## Installation

Version **0.1.1** established the corrected library package. The initial `0.1.0` npm artifact accidentally packaged the demo workspace; it should not be used as the integration baseline.

Install the latest published release:

```bash
pnpm add @encapsa-dev/brain
# npm install @encapsa-dev/brain
```

React and React DOM are peers. Import the stylesheet once at your application's global stylesheet boundary.

| Host | 2D/list | Optional 3D peers |
| --- | --- | --- |
| React 18.3.1 | Supported | `@react-three/fiber@8.18.0` + `three@0.186.1` |
| React 19.2.4 | Supported | `@react-three/fiber@9.8.1` + `three@0.186.1` |

Do not pair Fiber 9 with React 18. The release consumer matrix checks the listed combinations, not every version allowed by peer ranges. ESM-only output targets modern browsers; development and package tooling require Node 22.12+ (Node 24 recommended).

## Quick start: a knowledge graph

```tsx
'use client'

import { BrainExplorer } from '@encapsa-dev/brain'
import type { BrainGraph } from '@encapsa-dev/brain/core'
import '@encapsa-dev/brain/styles.css'

const graph: BrainGraph = {
  schemaVersion: '1',
  scopeKey: 'authorized-workspace-42',
  revision: 'snapshot-1',
  completeness: 'complete',
  nodes: [
    { id: 'site', label: 'Website', kind: 'pack', sourceNamespace: 'cms' },
    { id: 'voice', label: 'Brand voice', kind: 'page', sourceNamespace: 'cms' },
    { id: 'review', label: 'Review procedure', kind: 'skill', sourceNamespace: 'cms' },
  ],
  edges: [
    { id: 'site-voice', source: 'site', target: 'voice', kind: 'contains',
      directed: true, evidence: { origin: 'host-supplied' } },
    { id: 'review-voice', source: 'review', target: 'voice', kind: 'references',
      directed: true, evidence: { origin: 'host-supplied' } },
  ],
}

export function KnowledgePanel() {
  return <BrainExplorer graph={graph} renderer="svg" layout="brain"
    theme="light" style={{ width: '100%', height: 520 }} />
}
```

The library does not infer relationships from node proximity. Provide edges explicitly, and use `completeness: 'partial'` when the loaded graph is only a subset.

## Sidebar preview and dashboard tab

`BrainPreview` is designed for a narrow sidebar: no rotation controls, no node interaction, no inspector, and exactly one Expand button. The default SVG renderer avoids allocating another WebGL context beside the full explorer.

```tsx
'use client'

import { useState } from 'react'
import { BrainExplorer, BrainPreview } from '@encapsa-dev/brain'
import type { BrainGraph } from '@encapsa-dev/brain/core'

export function Dashboard({ graph }: { graph: BrainGraph }) {
  const [view, setView] = useState<'content' | 'brain'>('content')

  return <div style={{ display: 'flex', height: 640 }}>
    <aside style={{ width: 224, padding: 12 }}>
      <BrainPreview graph={graph} theme="light"
        style={{ width: '100%', height: 168 }}
        onExpand={() => setView('brain')}
        expandLabel="Open Brain tab" />
    </aside>
    <section style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <nav aria-label="Dashboard views">
        <button onClick={() => setView('content')}>Content</button>
        <button onClick={() => setView('brain')}>Brain</button>
      </nav>
      <div style={{ flex: 1, minHeight: 0 }}>
        {view === 'brain'
          ? <BrainExplorer graph={graph} variant="embedded" renderer="svg"
              theme="light" showContextTray={false} defaultNavigatorOpen={false} />
          : <p>Your existing dashboard content</p>}
      </div>
    </section>
  </div>
}
```

The host owns its tabs and focus management. `onExpand` does not trigger browser fullscreen or navigate automatically. `variant="embedded"` fills a height-constrained parent and retains the full explorer on narrow screens; provide `min-height: 0` through flex ancestors.

The synthetic `/embed` demo implements this pattern with Content, Conversation, and Brain tabs. It is a layout example, not an integration with a live customer application.

## Opt into interactive 3D

For a React 18 host:

```bash
pnpm add three@0.186.1 @react-three/fiber@8.18.0
```

For a React 19 host, use Fiber `9.8.1` instead. Keep the loader function stable and outside render:

```tsx
const loadWebGLRenderer = () => import('@encapsa-dev/brain/webgl')

<BrainExplorer
  graph={graph}
  renderer="auto"
  layout="brain"
  loadWebGLRenderer={loadWebGLRenderer}
  motion="system"
  nodeSize={{ metric: 'targetTokens', scale: 'sqrt', min: 4, max: 10, unknown: 3 }}
/>
```

`auto` without a loader renders SVG. A failed WebGL initialization, context loss, or sustained slow-frame condition falls back to 2D with an explicit retry. This is a rendering fallback, never a retry through a less-restricted data source.

## Public entry points

| Import | Purpose |
| --- | --- |
| `@encapsa-dev/brain` | React explorer, preview, components, hooks, public types |
| `@encapsa-dev/brain/core` | Framework-independent graph, identity, store, layout, projection, and receipt-matching utilities |
| `@encapsa-dev/brain/react` | Provider, composable React components, hooks |
| `@encapsa-dev/brain/webgl` | Optional Three.js / React Three Fiber renderer |
| `@encapsa-dev/brain/adapters/forge` | Pure Forge DTO converters and presentation preset |
| `@encapsa-dev/brain/styles.css` | Scoped styles and CSS custom properties |
| `@encapsa-dev/brain/layout-worker` | Optional worker module; host owns worker construction |

Neither the package root nor the 2D entry points eagerly imports the 3D renderer. No CommonJS or legacy-browser support is claimed.

## Compose your own explorer

```tsx
import {
  BrainProvider, BrainExplorerShell, BrainToolbar, BrainViewport,
  BrainInspector, BrainTierNavigator, BrainLegend, BrainAccessibleList,
} from '@encapsa-dev/brain/react'

<BrainProvider graph={graph}>
  <BrainExplorerShell variant="embedded" showContextTray={false} theme="light" />
</BrainProvider>
```

For fully custom layouts, compose `BrainViewport`, `BrainInspector`, `BrainToolbar`, `BrainTierNavigator`, `BrainLegend`, and `BrainAccessibleList` inside a `.brain-explorer` wrapper. The wrapper supplies CSS tokens; your own layout must give the viewport a nonzero size.

### Shared dashboard defaults

Renderer and inspector fixes belong in the package, not in copied dashboard
components. Starting in 0.1.3, every provider uses continuous connectors by
default in both 2D and 3D. Set `edgePattern="declared"` only when you explicitly
want preset/resolver `dashed` flags; those WebGL patterns now retain endpoints
and use length-aware subdivision rather than large missing sections.

`BrainInspector` and `BrainExplorer` accept `inspectorOptions`. Defaults hide
unknown versions, the completeness row, the technical metadata footer, and the
directed-path form. Known versions, relationship counts, authorized details,
security notices, receipt evidence, and context actions remain available.
The path finder is retained, not deleted:

```tsx
<BrainInspector
  showContextActions={false}
  inspectorOptions={{
    showDirectedPaths: false, // opt in when your graph supports the workflow
    labels: { source: 'Source', sourceEvidence: 'Source field' },
  }}
/>
```

`showUnknownVersion`, `showCompleteness`, and `showMetadataFooter` can explicitly
restore those fields. Source pointers are single-line, expandable on hover or
focus, and click-to-copy; failure to access the clipboard is reported honestly.
Relationship badges count unique loaded edges, not traversals.

For custom dashboard shells, reuse `BrainKindFilters`, `BrainConnectionPicker`,
`BrainPicker`, and `BrainCopyField` from `/react` rather than implementing their
styling and behavior in each application. `BrainKindFilters` accepts `label`
and `kindLabels`; `BrainConnectionPicker` accepts a label and three option
labels. The generic `BrainPicker` accepts labeled, optionally icon-bearing
options and supports keyboard selection. Menus and field popovers stay inside
the nearest host dialog or `.brain-explorer`, including native fullscreen.

### Main configuration

| Prop / extension | Behavior |
| --- | --- |
| `graph` | Immutable, already-authorized snapshot |
| `preset` | Node/edge styles, configurable tier functions or explicit hierarchy |
| `renderer`, `layout` | Initial standalone view; use `view` + `onViewChange` for ongoing controlled state |
| `variant="embedded"` | Fill parent without automatic miniature UI |
| `showContextTray={false}` | Hide composition UI when the host only needs exploration |
| `theme` | `light` or `dark`; override scoped `--brain-*` variables for your brand |
| `selectedNodeId`, `onSelectedNodeChange` | Controlled selection |
| `defaultSelectedNodeId` | Initial uncontrolled selection |
| `expandedGroups`, `onExpandedGroupsChange` | Controlled hierarchy |
| `filters`, `onFiltersChange` | Loaded-label/ref query, kinds, neighborhood, group |
| `view`, `onViewChange` | Controlled renderer, layout, quality |
| `nodeSize` | Clamped metric-based radii; missing metrics stay distinct |
| `onRequestDetails` | Lazy host-authorized details, with abort/scope/revision checks |
| `renderNodeDetails`, `renderNodeActions` | Custom inspector content and actions |
| `nodeStyleResolver`, `edgeStyleResolver` | Renderer-neutral styling |
| `edgePattern` | `continuous` by default; `declared` opts into preset/resolver dash flags |
| `inspectorOptions` | Shared visibility controls and label overrides; directed paths opt in |
| `layoutAdapter`, `layoutWorkerFactory` | Bounded custom layouts / worker execution |
| `toolbarStart`, `toolbarEnd`, `receiptControls` | Host interface slots |
| `loadingSlot`, `emptySlot`, `errorSlot`, `unsupportedSlot` | Replaceable status UI |
| `motion` | `system`, `reduced`, or `full`; auto-rotate is off by default |
| `onDiagnostic` | Optional content-free diagnostics; no built-in telemetry |

The explorer ref exposes `focusNode(id)`, `fit()`, `resetCamera()`, and `rotate(yawRadians, pitchRadians)`. Controlled values change only when the host accepts their callbacks.

### Graph identity and hierarchy

Use stable, namespaced node IDs. Labels, slugs, and content hashes are not globally unique identities. `namespacedId(scopeKey, sourceNamespace, resourceKey)` and `snapshotId(resourceId, version)` are available from `/core`.

Keep the canonical graph separate from presentation grouping. Hierarchy collapse aggregates loaded members without deleting canonical nodes. Declare whether counts are loaded counts or authoritative totals; an unknown total stays unknown.

### Safe details and data loading

`BrainDataSource` supports `loadGraph({ scopeKey, cursor, signal })`, optional `loadDetails({ scopeKey, nodeId, graphRevision, signal })`, and optional revision subscriptions. Invoke `store.loadGraph(...)` from your host data layer; pass the detail loader as `onRequestDetails`.

The store treats returned graphs as replacement snapshots. If your API returns incremental pages, merge and validate those pages in the host before supplying a graph. Change `revision` for each new snapshot and `scopeKey` whenever the authorization context changes, including an account/site/role boundary.

`AuthorizedNodeDetails` has `scopeKey`, `graphRevision`, `nodeId`, primitive labeled `fields`, optional `authorizedText`, and optional evidence pointers. Text is escaped; the package does not render raw HTML or download remote assets. Authorization/scope errors clear graph data and pending work rather than trying another source.

Set `copyable: true` on an authorized detail field to use the reusable full-value
copy/disclosure control. This is independent of its display label, so hosts do
not need conventions such as naming every copyable field “Field.”

## Forge, AI context, and RAG interfaces

Use the package as a presentation layer for context Packs, page inventories, Skills, retrieved documents, or explicit agent dependencies. It does not retrieve documents, generate embeddings, execute agents, or infer an LLM's reasoning.

The optional Forge adapter separates:

- `normalizeForgeCatalog`: summaries and allowlisted host projections.
- `normalizeForgeResolveResponse`: public resolved refs/pages and receipt-level fields.
- `normalizeForgeGenerationReceipt`: the narrower public generation receipt, without inventing per-source inclusion/redaction.
- `normalizeForgeInternalReceipt`: richer evidence explicitly supplied by a trusted host, not a new public Forge API.

Null token counts remain unknown. A PHI flag does not establish redaction. Historical version mismatches remain unmatched. Receipts do not prove an ordered traversal or per-stage timing; the demo's illustrative pipeline is labeled accordingly.

## Accessibility, fullscreen, and limitations

The explorer offers search, keyboard-operated controls, semantic entity lists, relationship navigation, reduced-motion support, and light/dark themes. Native fullscreen is attempted only after activation; unsupported environments receive a clearly labeled expanded overlay with focus restoration.

The 3D renderer uses instanced nodes and batched edges. Large loaded graphs should use collapsed regions and focused neighborhoods; there is no unlimited-scale or all-edges-visible promise. Spatial proximity is a layout, not semantic similarity. Automated accessibility tests are useful regression checks, not certification.

Authorization belongs to the host. Filtering or hiding a node in the browser does not secure it, and even metadata can be sensitive. Do not send unauthorized labels, counts, body text, credentials, or compiled prompts to the viewer.

## Development and release

Use Node 24 and pnpm 12.3.4. Run the release check from the repository root:

```bash
pnpm release:check
```

It runs the frozen install, package build, typecheck, lint, unit tests, Chromium setup, packed React/Fiber consumer matrix, demo build and browser tests against a temporary production server. It also inspects the package artifact, release version, registry, and generated files. A failed check stops the release.

For an interactive development preview, run `pnpm dev` separately after `pnpm build:package`; stop it before the production build.

The **repository root is a private demo workspace**. Only `packages/brain` is published. After the release PR and resulting `main` CI pass, repeat `pnpm release:check` from a clean, reviewed `main` checkout. Then publish with:

```bash
pnpm --filter @encapsa-dev/brain publish --access public
```

The package's `prepublishOnly` hook repeats the release check during publish; publication proceeds only when it passes. The root's publish guard remains in place. Prepack builds the library and copies the canonical README, CHANGELOG, and existing BSD license into the package. See [CONTRIBUTING](https://github.com/encapsa-ai/brain/blob/main/CONTRIBUTING.md), [DEVELOPMENT](https://github.com/encapsa-ai/brain/blob/main/DEVELOPMENT.md), and [verification notes](https://github.com/encapsa-ai/brain/blob/main/docs/verification.md).

## License and community

BSD-3-Clause, copyright Encapsa, Inc. The existing [LICENSE](https://github.com/encapsa-ai/brain/blob/main/LICENSE) is authoritative.

Have a reproducible bug, integration example, or accessibility improvement? [Open an issue](https://github.com/encapsa-ai/brain/issues) with a minimal synthetic graph. Explore [Encapsa AI](https://encapsa.ai) to learn about the team building the library.
