# Contributing to @encapsa-dev/brain

Contributions should make connected knowledge easier to understand without tying the library to a particular application or backend. Use synthetic fixtures and keep changes focused enough to review and test.

## Setup

Use Node 24 and the pinned `pnpm@12.3.4`. Enable Corepack or install that exact pnpm version, then run:

```bash
pnpm install --frozen-lockfile
pnpm build:package
pnpm dev
```

The root hosts the Next.js demo. Library source is in `packages/brain/src`; unit tests are in `packages/brain/tests`; browser scenarios are in `apps/demo/tests/browser`. `/embed` demonstrates sidebar preview → host tab behavior.

## Before opening a pull request

- Open an issue for a major API or architectural change before implementing it.
- Branch from `main`, using `fix/`, `feature/`, or `docs/`.
- Use Conventional Commits, for example `fix(preview): preserve host tab focus`.
- Keep the core free of React, browser globals, network clients, and secrets.
- Keep optional WebGL dependencies out of the root/2D import path.
- Add regression tests for behavior changes, including failure states.
- Update the root README and CHANGELOG when changing public behavior.
- Preserve the maintainer-provided README animation.
- Do not change the BSD license, publish, or change production configuration as part of a contribution.

## Required checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm verify:consumer
```

Run `pnpm start` separately, then `pnpm test:browser`. The packed-consumer check builds and installs the actual tarball in clean React 18/19 SVG and WebGL hosts. For UI changes, also inspect desktop/mobile and light/dark screenshots; passing assertions alone do not establish visual quality.

If a check cannot run, report the exact command and limitation. Do not call an unexecuted test passed.

## Data and security

Every demo, issue, screenshot, and fixture must use fictional data. Never include customer content, PHI, credentials, compiled prompts, or private identifiers. Hosts own authentication and authorization; do not introduce a client-side permission check as a substitute.

Do not report an exploitable security issue publicly with sensitive reproduction data. Use GitHub private vulnerability reporting if available; otherwise ask a maintainer for a private reporting channel without disclosing the exploit or private data in the issue.

## Pull request contents

Explain the problem, API/behavior changes, tests run, compatibility implications, and any remaining limitations. Include a before/after screenshot for visible changes and identify whether evidence came from source imports or a packed consumer.

Maintainers control versions and publication. The publish target is `packages/brain`, never the private workspace root; follow DEVELOPMENT's release checklist.
