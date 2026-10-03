# Verification evidence — 0.1.0 release candidate

This is an implemented library and synthetic demonstration, not a production Forge integration. The package has not been published. Verification below distinguishes executed checks from tests that could not run in this environment.

## Running the implementation

- In v0, open the preview at `/`. No integration, database, credential, or external visualization asset is required.
- For a local checkout obtained through GitHub: install with `pnpm install`, build the library with `pnpm build:package`, then run `pnpm dev`. Build the package first because `/package-proof` imports its distribution rather than source aliases.
- `pnpm build` builds the package and production Next.js application. `pnpm start` serves that production build.
- `pnpm verify:consumer` creates a fresh temporary directory, packs the library, installs that exact tarball in the independent Vite React example, typechecks/builds it, and executes its Node SSR proof.
- `/package-proof` is a working Next.js client/server-boundary example using package exports. `examples/next-consumer` and `examples/vite-react` contain the consumer sources.

Public entry points, controlled/uncontrolled APIs, composition, layout adapters, data-source boundaries, and host responsibilities are documented in `packages/brain/README.md`. The exports are the package root, `/core`, `/react`, `/webgl`, `/adapters/forge`, `/styles.css`, and optional `/layout-worker`.

## Executed automated checks

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Passed for the application and strict library configuration. |
| `pnpm lint` | Passed. |
| `pnpm test` | **99 tests passed in 12 files.** |
| Library ESM and declaration build | Passed through `pnpm verify:consumer`. |
| `npm pack --dry-run --json --ignore-scripts` | Passed; distribution inventory checked by the verification script. |
| Actual `npm pack` and tarball installation | Passed in a fresh Vite React consumer. |
| Clean consumer strict TypeScript and Vite production build | Passed without Three, Fiber, or `@types/three` installed. |
| Packed core, Forge adapter and React SSR imports | Passed in Node without `window`, `document`, or an initialized canvas. |
| `pnpm exec next build` after the package build | Passed; `/` and `/package-proof` prerendered successfully. |
| `pnpm exec playwright test --list` | Discovered **18 tests in 4 files**. Discovery is not execution. |

The final consumer uses React/React DOM 19.2.4, TypeScript 5.7.3 and Vite 8.3.2 on Node 24.16.0. React 18 compatibility is not claimed. The workspace lockfile records the complete dependency graph.

The checked tarball contains 19 files: README, package manifest, compiled ESM, declarations, worker and scoped CSS. Its recorded size was approximately 65.6 kB compressed / 294.8 kB unpacked. The script rejects source directories, source maps, fixtures, tests, environment files and `node_modules`, and asserts that required CSS and public declarations exist. `docs/consumer-proof.json` records the final inventory and temporary consumer location; those temporary paths are evidence, not portable installation instructions.

### Regression coverage added during hardening

- Custom layout timeout/cancellation aborts its signal even when the adapter ignores cancellation.
- Nonfinite, incomplete, wrong-scope and stale-revision layout responses use a bounded fallback.
- Completed custom positions are associated with their exact filtered projection, layout, seed and dimension, not just the graph revision.
- Empty/unavailable projections do not start an initialization deadline for an unmounted WebGL renderer.
- Renderer readiness is renewed after list/2D switches, empty projections and hidden containers.
- Scope changes and authorization failures invalidate stale data, details, observations and pending work.
- Slow-frame windows include frames longer than 250 ms. Demand-rendering idle gaps are excluded, and separate recovery/degradation thresholds prevent oscillation.

Other passing tests cover identity, graph validation, containment/reference cycles, aliases, directed aggregation, immutable layouts, version/page-aware receipt matching, public versus internal receipt evidence, controlled state, multiple instances, composition, escaped text, privacy and SSR-safe imports.

## Real-browser smoke evidence

Browser: automated `agent-browser`, HeadlessChrome 151.0.0.0 on Linux x86_64, launched with graphics support. These are actual preview interactions and observations, **not a claim that the standalone Playwright suite ran**.

Checked flows include:

- Actual WebGL canvas, discrete rotation changing projected positions, 2D/list switching and consistent inspector selection.
- Return to WebGL after list/2D, hiding and revealing the container, and clearing an empty search after the initialization deadline interval.
- Auto-rotation starts off and pauses on unrelated user interaction; it does not resume automatically.
- Search, directed relationship navigation, scope/dataset changes, hierarchy, simulated receipt outcomes and historical unmatched evidence.
- Explicit retry, context-loss recovery and deterministic worker-timeout fallback; the semantic alternative remains available.
- Rejected native fullscreen opens an honestly labeled overlay. Layered Escape restores the fullscreen trigger and prior page overflow.
- Light and dark desktop rendering at 1639 × 1071.
- Narrow 390 × 844 layout, expanded mobile explorer, accessible-list drawer and focus restoration after Escape, with no horizontal document overflow.
- 200% **CSS zoom emulation** at 1639 × 1071: responsive navigator remains reachable and no horizontal document overflow. This is not a native-browser-zoom or screen-reader certification.
- `/package-proof`: the packaged accessible list selects its canonical entity and opens the inspector with zero canvases present.

The saved Playwright keyboard-only journey and axe assertions are not counted as executed. Browser smoke checks establish individual keyboard/focus behaviors, not a comprehensive assistive-technology audit.

## Performance: measurements versus goals

### Software-renderer orbit observations

Environment: development preview `/`, automated HeadlessChrome 151 on Linux x86_64, ANGLE Vulkan **SwiftShader Device (Subzero)**, viewport 1639 × 1071, canvas 1345 × 608 CSS and backing pixels, DPR 1, brain layout, high-quality setting, no selected node. Physical GPU/CPU model was not available.

Method: a temporary browser-only wrapper timestamped the scene's WebGL `clear` calls during auto-orbit. Consecutive intervals were sorted for p50/p95. The wrapper was restored afterward; no instrumentation, telemetry, identifiers or payload capture was added to the shipped demo. These are render-cadence intervals, not GPU timer-query measurements.

| Visible / loaded nodes | Shown / loaded edges | Intervals | p50 | p95 | Maximum |
| --- | --- | --- | --- | --- | --- |
| 100 / 100 | 123 / 123 | 120 | 114.9 ms | 136.9 ms | 145.0 ms |
| 1,000 / 1,000 | 0 / 1,248 | 116, partial capture | 363.1 ms | 426.3 ms | 456.9 ms |

The 1,000-node capture did not reach its intended 120 intervals before the browser wait budget; the 116 captured intervals were retained, not presented as a completed 120-sample run. The focused-edge policy intentionally shows zero edges without a selected entity at this scale, as disclosed in the legend. This is not a dense-edge benchmark.

These slow software-renderer observations exposed the previous exclusion of severe frame intervals from adaptive-quality accounting. That exclusion was fixed; four frame-monitor tests now cover severe stalls, threshold progression, recovery hysteresis and idle gaps. A complete real-time four-window performance downgrade was not timed end-to-end.

After the final monitor change, an idle 1,000-node WebGL instance produced **zero clear calls over an observed 801 ms quiet interval**. This is bounded evidence of demand rendering at rest, not a universal performance guarantee.

**The requested 50 FPS target on a named modern physical desktop remains unmeasured and unverified.** The software results are below that goal and must not be marketed as desktop GPU performance. The 5,000-node fixture uses initial level-of-detail aggregation; no all-label/all-edge rendering guarantee or 5,000-visible-node frame benchmark is claimed.

### Initial-page Web Vitals

A separate automated development-preview navigation of `/` at 1639 × 1071, DPR 1, measured:

- TTFB: 149.9 ms.
- FCP: 592 ms.
- LCP: 592 ms, a paragraph element rather than completion of the WebGL scene.
- CLS: 0 during the recorded navigation.
- Reported hydration interval: 158.2 ms.
- INP: unavailable; the navigation measurement contained no qualifying interaction.

These are one-run laboratory observations with development tooling, not production field data or a proof of interaction readiness.

## Blocked and unverified gates

- **Standalone Playwright execution is blocked** by missing Chromium OS libraries, including `libglib-2.0.so.0`. The targeted `playwright install-deps chromium` recovery failed because this sandbox has no `apt-get`. Reinstall loops were not attempted. All 18 browser specifications remain unverified as a suite.
- Consequently, automated axe results and the complete saved keyboard-only journey are **unverified**, not passing accessibility claims. Native mobile devices, screen-reader combinations and native browser zoom also remain unverified.
- Physical desktop GPU frame performance, production field Web Vitals and exhaustive browser coverage remain unverified.
- Three emits a `Clock` deprecation warning through the current compatible Fiber runtime; it did not prevent the verified canvas interactions or production build. Vitest emits a future Vite config-loader warning; checks pass under the installed versions.
- Publishing, npm namespace availability/ownership, public repository destination, license/assets approval and any real Forge host integration require operator decisions. The package remains `UNLICENSED` pending that review; MIT is recommended, not represented as approved.

No production endpoint, Forge/Octane source, authorization policy, shared secret, external service, storage backend, deployment or npm publication was touched. The unresolved validation gates above must be completed in a suitable environment before representing this candidate as fully acceptance-tested.
