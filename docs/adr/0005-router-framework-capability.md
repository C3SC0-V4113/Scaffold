# ADR-0005: Model client routers as framework capabilities

**Status**: Accepted
**Date**: 2026-10-15

## Context

Vite can scaffold a plain single-page app or a React Router app in either data
or declarative mode. These choices change the entry point, route tree, error
handling, generated tests, dependencies, and agent guidance. Next.js and Astro
already own routing and should not receive a second router.

## Decision

Represent router selection as the `RouterChoice` enum on resolved
`CreateOptions`. Each `FrameworkAdapter` declares its supported values through
`capabilities.routers` and may provide a default. Vite supports `none`,
`react-router-data`, and `react-router-declarative`, defaulting to data mode;
Next.js and Astro declare an empty list and resolve to `none`. Generic option
validation uses these capability declarations.

Router selection belongs to a framework adapter rather than a feature module
because it reshapes the app shell and how routes are registered. Future router
support, such as `tanstack-router`, should add an enum choice and capability to
the relevant adapter, with its own templates and validation coverage.

## Consequences

**Good**: The framework registry remains the source of truth for supported
router modes, validation is independent of framework names, and `--router
none` preserves the plain Vite SPA output. Generated tests and docs follow the
selected mode.

**Trade-off**: Adding a router requires updating the shared enum and adapter
templates as well as its package pin, test, docs, skill, and E2E coverage.

## Related decisions

- [ADR-0003: Use framework adapters selected by a registry](0003-framework-adapters.md)
- [ADR-0004: Scaffold Vite before initializing shadcn](0004-vite-framework.md)
