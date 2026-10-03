# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - Unreleased

### Added

- `BrainPreview`: non-interactive, dynamically sized overview with one host-owned Expand action.
- `BrainExplorer` embedded variant for full-height dashboard tabs, plus optional context-tray visibility.
- Synthetic `/embed` dashboard example and browser regression tests.
- Clean packed-consumer verification for React 18.3.1/Fiber 8.18.0 and React 19.2.4/Fiber 9.8.1.
- Public package metadata, contributor/development guidance, and release CI checks.

### Fixed

- Corrected the publish boundary: the private root is the demo workspace; `packages/brain` is the public library with exports and TypeScript declarations.
- Removed the accidental npm self-dependency from the release artifact.
- Applied the repository's existing BSD-3-Clause license and included LICENSE, README, and CHANGELOG in the tarball.
- Preserved the README animation in both repository and npm package documentation.
- Cleared stale detail payloads on graph replacement and invalidated old subscriptions across disposal/resume.
- Made incoming relationship navigation select the opposite endpoint.
- Kept offscreen renderers paused when browser visibility changes.
- Corrected light-theme primary-action contrast and reduced preview node size for sidebar dimensions.
- Prevented malformed receipt references from matching unrelated generic nodes.
- Made layout position dictionaries safe for IDs such as `__proto__`.

### Compatibility

- React 18 support is additive; the demo continues to use React 19.
- No Forge or application backend, data model, or environment-variable changes.
- `0.1.0` was published from the workspace root and is not a usable library integration baseline. After this release, install `0.1.1` from the corrected package.

## [0.1.0] - 2026-10-02

### Added

- Initial 3D/SVG/list explorer, headless graph core, Forge adapters, and synthetic demo.
- Initial npm publication inadvertently contained the demo workspace rather than the library package.

---

## License

[BSD-3-Clause](https://github.com/encapsa-ai/brain/blob/main/LICENSE) © [Encapsa AI](https://encapsa.ai)

---

**Questions?** [Open an issue](https://github.com/encapsa-ai/brain/issues).
