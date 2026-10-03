# Development Guide

## Overview

This repository contains a private Next.js demo workspace and one public library, `packages/brain`. Keep those release boundaries separate: the app's Next.js, Tailwind, shadcn, React, and optional graphics dependencies must never become normal dependencies of the library tarball.

## Repository map

| Path | Responsibility |
| --- | --- |
| `packages/brain/src/core` | Pure graph/store/projection logic |
| `packages/brain/src/react` | Provider, explorer, preview, controls |
| `packages/brain/src/renderers` | SVG, accessible list, optional WebGL |
| `packages/brain/src/adapters/forge` | Pure DTO/host-projection conversions |
| `packages/brain/src/layout` | Deterministic layouts and worker contract |
| `packages/brain/src/styles` | Scoped library CSS |
| `packages/brain/tests` | Unit/integration regression tests |
| `apps/demo` | Fictional data, demo UI, browser tests |
| `app` | Next.js routes `/`, `/embed`, `/package-proof` |
| `scripts/verify-consumer.mjs` | Actual tarball and React compatibility proof |

## Local workflow

Use Node 24 and pnpm 12.3.4. Run `pnpm install --frozen-lockfile`, `pnpm build:package`, and `pnpm dev`. The `/package-proof` and `/embed` routes consume distribution exports; rebuild the library after changing its source.

The library's TSUP configuration externalizes React/Three/Fiber and marks React entry points as client boundaries. Core/adapters remain importable without DOM globals. Generated `dist` files are tracked in this repository; regenerate them, never hand-edit them.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm verify:consumer
```

For browser tests, start `pnpm start` and run `pnpm test:browser`; override `BRAIN_TEST_URL` when testing a different local/preview host. `verify:consumer` runs its own temporary static servers and browser checks, with strict peer validation and TypeScript declarations.

Packed SVG consumers intentionally omit `three`, Fiber, and `@types/three`. WebGL consumers explicitly install the matching Fiber generation. Compatibility ranges are not permission to mix React 18 and Fiber 9.

Optional `BRAIN_STATIC_EXPORT=1 pnpm build` creates `out/` for a static review preview. This build-only switch does not change default Next.js hosting or connect any production data. No production secrets/environment deltas are required for 0.1.1.

## Release checklist for maintainers

1. Review and merge the release PR.
2. Confirm the version in `packages/brain/package.json` and the CHANGELOG heading. Change `Unreleased` to the actual release date when publishing.
3. Install from the reviewed lockfile and run every verification gate.
4. Run `pnpm --filter @encapsa-dev/brain pack` and inspect the tarball: library ESM, declarations, worker, styles, README, LICENSE, CHANGELOG, and package manifest only.
5. Confirm `npm view @encapsa-dev/brain@0.1.1 version` does not already exist. A published version cannot be replaced.
6. From the reviewed checkout, run `pnpm --filter @encapsa-dev/brain publish --access public` using your normal npm authentication.
7. Verify npm metadata, exports, license, README animation, and install/import the published version in a clean host.
8. Tag the reviewed commit and create the GitHub release after successful publication.

Do not publish from the workspace root. The root is now private and has a `prepublishOnly` guard. Do not use `--ignore-scripts` for release publication: prepack synchronizes public docs/license and builds distribution output.

The npm listing from 0.1.0 will not change merely because this PR is merged. Correct npm metadata and package contents take effect when the maintainer publishes 0.1.1.

## First application integration

The approved layout is a narrow sidebar overview with only Expand, a host-owned Brain tab beside Content/Conversation, and a responsive explorer filling the central content region. Keep navigation, analytics, and the composer outside the visualization.

For the first host, React 18/Fiber 8 is the relevant compatibility lane. Do not upgrade the application's React/Next versions merely to install this library. Start with already-authorized page/brand/market metadata; do not claim those records are persisted Forge Packs or execution receipts unless a backend contract actually establishes that.

Implement the actual application integration in a separate PR after publication. The `/embed` route and README demonstrate the library-side contract; they do not wire the application to live Forge endpoints.

## GitHub About metadata

Recommended settings for a maintainer to apply after review:

- Description: `Composable React knowledge graph visualization: interactive 3D brain, 2D graph, accessible explorer, and compact AI-context dashboard previews.`
- Website: `https://brain-two-lake.vercel.app`
- Topics: `react`, `typescript`, `knowledge-graph`, `graph-visualization`, `brain-visualization`, `threejs`, `webgl`, `react-three-fiber`, `ai-context`, `rag`, `accessibility`, `dashboard`, `encapsa`

Package metadata is already prepared in `packages/brain/package.json`. GitHub About settings are outside the Git diff and are deliberately left for maintainer review rather than changed before merge.
