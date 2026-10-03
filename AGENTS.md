# AGENTS.md — AI Coding Agent Guide for @encapsa-dev/brain

This is a TypeScript visualization library inside a pnpm workspace, with a Next.js synthetic demo at the root. Only `packages/brain` is publishable; the root is private. One root instruction file is sufficient because the package and demo share a small, explicit verification workflow.

## Non-negotiable boundaries

- Keep `src/core` framework-independent and free of DOM/network access.
- Never eagerly import Three/Fiber from root, core, React, or Forge-adapter entry points.
- Maintain React 18/Fiber 8 and React 19/Fiber 9 compatibility through packed-consumer tests.
- Preserve scope isolation, cancellation/generation checks, and unknown receipt fields.
- Do not log graph data, details, raw errors, prompts, or credentials.
- Hosts authorize all metadata before it reaches the library. UI filtering is not authorization.
- Use synthetic demo/test data only. No live Forge/app requests.
- Preserve the maintainer's README animation and the existing BSD-3-Clause license.
- Do not publish, merge, or change production settings without explicit authorization.
- Rebuild tracked `packages/brain/dist` output; never manually edit generated chunks.

## Source map

- `packages/brain/src/core`: canonical graph, identities, state, projections.
- `packages/brain/src/react`: React APIs including `BrainExplorer` and `BrainPreview`.
- `packages/brain/src/renderers`: renderer-specific behavior.
- `packages/brain/src/adapters/forge`: public DTO versus richer host observations.
- `apps/demo`: fixture-only product examples and browser tests.
- `scripts/verify-consumer.mjs`: tarball installation and compatibility matrix.

Use Node 24 and pinned pnpm 12.3.4. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm verify:consumer`, and browser tests against a running demo before claiming release readiness. Read DEVELOPMENT for commands and release safeguards; record unrun checks explicitly.

`BrainPreview.onExpand` belongs to the host's navigation, not browser fullscreen. An embedded explorer requires a height-constrained parent with `min-height: 0`; do not force viewport dimensions into reusable library code.
