# 0.1.1 readiness audit and verification

This release prepares the library for its first application integration. It does not integrate a live application, change Forge, publish to npm, or establish a compliance certification. The initial source baseline was `574ed1c`; npm's `0.1.0` manifest was independently inspected.

## Approved scope

Jordan approved the complete 0.1.1 scope: correct packaging, sidebar preview, embedded explorer, React 18/19 packed-consumer compatibility, lifecycle/security fixes, documentation and metadata, CI, and a synthetic dashboard example. Changes remain in `encapsa-ai/brain` on a review branch; `Toastability/app` was inspected read-only for compatibility/layout.

In scope: `packages/brain` source/tests/generated distribution/package metadata, root release tooling/manifests/docs, demo routes/components/browser tests, and CI. Out of scope: host application edits, production data, backend authorization, Forge schemas/receipts, deployment secrets, merging, npm publication. Rollback before merge is closing the PR; after merge, revert its commits rather than attempting to overwrite an npm version.

## Audit findings

| Priority | Finding | 0.1.1 disposition |
| --- | --- | --- |
| Blocker | npm 0.1.0 contained the root demo workspace, including a self-dependency, rather than the exported library | Root renamed/private with a publish guard; nested package is the sole publish target; actual tarball tested |
| Blocker | First application host uses React 18; library claimed React 19 only | Additive peer support, tested with React 18.3.1/Fiber 8.18.0 and React 19.2.4/Fiber 9.8.1 |
| High | Existing compact explorer still exposed several controls and opened its own overlay | New read-only `BrainPreview` with one host-owned expand callback |
| High | Full explorer used fixed default height and switched to miniature UI in narrow host tabs | `variant="embedded"` fills a constrained parent and retains full controls |
| High | Ready detail content could survive a graph replacement if the host reused a revision | Invalidate details on every replacement; regression test |
| High | A disposed/resumed store could accept an old subscription callback | Increment generation on disposal and clear subscription; regression test |
| High | Malformed receipt refs could match generic nodes with absent resource keys | Reject matching without a resource identity; regression test |
| Medium | Layout dictionaries inherited object properties, conflicting with arbitrary node IDs | Null-prototype position dictionaries and own-property checks; regression tests |
| Medium | Incoming relationship navigation could remain on the already selected target | Navigate to the opposite endpoint |
| Medium | Document visibility could restart work for an offscreen viewport | Combine intersection and document visibility |
| Medium | Browser accessibility test found light-theme primary-action contrast failure | Dedicated accessible action-text token; browser test rerun |
| Medium | Small sidebar nodes visually overwhelmed the miniature | Smaller preview-only defaults; desktop visual check |
| Medium | Hiding the composition tray left an unusable Add to context action | Hide default inspector composition action with the tray |
| Medium | Public package metadata/license/docs contradicted the repository | BSD-3-Clause synchronized; root README/GIF copied at prepack; metadata and docs completed |

## Executed checks

Environment: Linux sandbox, Node 24.16.0, pnpm 12.3.4, Playwright Chromium 153 with software WebGL. Exact dependency resolution remains in the lockfile; no root dependency versions were upgraded.

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm test` | 107 tests passed in 13 files |
| Library ESM and declaration build | Passed |
| Static production demo build | Passed for `/`, `/embed`, and `/package-proof` |
| `pnpm test:browser` | 20 browser tests passed |
| `pnpm verify:consumer` | Four packed-consumer lanes passed |
| Package contents/license/readme assertions | Passed |
| React/core/adapters SSR imports | Passed in both React generations |
| Optional graphics absent in SVG-only consumers | Verified |
| `git diff --check` | Passed |

The packed-consumer matrix installs the actual tarball in isolated directories, uses strict peer validation, runs strict TypeScript and production Vite builds, then checks browser preview expansion, actual renderer readiness, selection, and rotation. The four lanes are React 18 SVG, React 19 SVG, React 18/Fiber 8 WebGL, and React 19/Fiber 9 WebGL. `docs/consumer-proof.json` contains the portable result summary; `.consumer-proof/results.json` is the ignored local/CI output.

Browser coverage includes search/selection, incoming/outgoing relationship views, discrete rotation, dragging versus clicking, fit/reset, hierarchy collapse/expand, simulated receipt uncertainty, dynamic fixture mutations, 5,000-node aggregation/list navigation, context loss and retry, worker fallback, fullscreen rejection/overlay focus restoration, hidden/zero-size recovery, light/dark accessibility checks, mobile/200% zoom, packed Next client imports, and the new host-tab flow.

## Visual QA inventory

| Claim | Check |
| --- | --- |
| One-action sidebar miniature | Desktop `/embed`, approximately 208×168; only Expand is interactive |
| Expansion belongs to the host | Expand activates Brain tab without requesting fullscreen |
| Center fills available space | Compare explorer and central content bounds; analytics/composer stay outside |
| Responsive explorer | Desktop and 390×844 mobile, no horizontal page overflow |
| Light/dark and selected details | Inspect light overview, dark selected-node inspector, mobile inspector |
| Reachable fallback | Forced initialization failure, real context loss, explicit retry, SVG/list navigation |
| Layout/selection continuity | Repeated renderer/tab changes and hidden-container recovery |

Visual checks addressed clipping, overflowing host content, crowded preview nodes, and action-button contrast. The mobile inspector intentionally overlays the canvas; it is not an always-visible desktop side panel.

## Limits and follow-up

- The 5,000-node test proves aggregated navigation and reachable entities, not 60 FPS with all nodes/labels/edges expanded. Hardware FPS, Safari/iOS, Firefox, and screen-reader compatibility were not exhaustively benchmarked.
- The optional WebGL consumer bundle triggers Vite's large-chunk warning because Three/Fiber are loaded in a separate graphics chunk. Do not present the total graphics stack as a tiny package; SVG consumers remain independent of it.
- The generic directed-path helper can traverse undirected edges, and the inspector's path wording merits a future UX clarification. This does not affect explicit directed-edge rendering or the approved dashboard embedding flow.
- Hosts must authorize metadata before supplying it and merge paginated data into replacement snapshots. This library is not an authentication layer or graph API.
- Unknown receipt fields remain unknown. No production resolution trace or live source graph was invented.
- GitHub About recommendations are in DEVELOPMENT; repository settings are intentionally not changed before review.
- npm metadata/package contents change only when the maintainer publishes 0.1.1. Do not install the existing 0.1.0 artifact for the first integration.
- No production configuration or environment-variable changes are required. `BRAIN_STATIC_EXPORT` is an optional build-only preview switch.

## Maintainer handoff

Review the PR, merge, run the release checklist in DEVELOPMENT, and publish only `packages/brain`. The application integration should follow in a separate PR, using the screenshot's preview → Brain tab → center-panel pattern and the React 18 compatibility lane.
