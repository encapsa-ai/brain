# Brain library decision record

These are new decisions for this library, not amendments to Forge's governance register or claims about additional Forge APIs.

| Decision | Rationale | Revisit trigger |
| --- | --- | --- |
| Graph projection, not a graph database | The host supplies already-authorized explicit relationships; Packs/Skills remain Forge's governed context resources. | A separately approved backend graph contract and authorization design. |
| Headless core plus optional React/rendering adapters | Framework-independent types, stores and transformations can run in Node; React UI and GPU code live at separate entry points. | A real non-React consumer requiring bindings or another graphics engine. |
| Independent hierarchy, resolution and renderer tiers | Presentation drill-down, runtime evidence and accessibility/quality solve different problems; no overloaded tier field. | Proven host use cases that cannot be composed using these independent states. |
| 2D/list fallback, never policy fallback | Initialization/context/worker failures may change rendering; authorization failures clear state and never try another data source. | A newly approved host data capability with independently enforced authorization, not a rendering concern. |
| Evidence-backed directed relationships and unknown preservation | Manifest containment, explicit references, activation declarations, sharing and receipts mean different things. Missing fields cannot establish inclusion/redaction. | Updated, reviewed Forge DTO contracts exposing new evidence. |
| Metadata-first authorized host projection | No body scraping, compiled prompts, secrets or signing in the package. Metadata itself must be authorized. | An approved safe-detail presentation requirement with an allowlist and content-security review. |
| Explicit optional WebGL loader | A static dynamic import still makes bundlers resolve optional peers. Loader registration keeps clean 2D-only consumers free of Three/Fiber and their types. | A proven bundler-neutral optional-module loading mechanism. |
| Deterministic bounded layouts before force simulation | Stable seeded IDs, preserved prior positions, and bounded work are predictable for embeds and dynamic graphs. | Measured connection clarity or scale problems that justify a bounded worker-based plugin. |
| Separate resource and snapshot identities | Identical labels/hashes are not identity. Receipt matching requires actual version/page/hash evidence. | An approved version-history projection needing explicit multi-snapshot UI. |
| Synthetic in-memory demo only | No persistence, telemetry, credentials, services or production API access is needed or permitted. Local fixture mutations are labeled. | Explicit authorization for a real host integration and opt-in tests. |
| License review remains an operator gate | The scope recommends MIT but does not authorize a copyright holder or publication. Package remains UNLICENSED pending review. | Operator approval of final license, assets, namespace and public repository. |

## Proposed later Forge host boundary

```text
Browser / @encapsa-dev/brain
  -> host application's authenticated backend
    -> Forge's existing authorized context APIs
  <- allowlisted authorized graph, details, observation
```

No `/v1/context/graph` route was invented. No resolver traversal, reference grammar, compiler ordering/hash, receipts, authorization or Forge/Octane source/runtime was changed. The only working Forge presentation realm is the default realm; global Skills remain outside tenant realms and private Skill namespaces are not invented.

## Structural mapping

The repository keeps the existing Next.js app at the root for v0 preview routing, with reusable code in `packages/brain` and demo-only fixtures/components/tests in `apps/demo`. The independent Vite consumer uses packed output, not source aliases. Library CSS is scoped to `.brain-explorer`; only the demo uses root document styling. There are no fonts, models or other visualization assets fetched remotely.
