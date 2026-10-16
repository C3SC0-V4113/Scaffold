# ADR-0006: Add React Router framework mode

**Status**: Accepted
**Date**: 2026-10-15

## Context

purrfold already supports React Router as an optional Vite router. React Router
framework mode owns its route tree, server rendering, build, and type generation,
so it needs a separate adapter. The upstream default template uses `app/` and the
`~/*` alias; shadcn recognizes the framework and keeps that alias in its generated
`components.json`.

## Decision

Add `react-router` as a framework adapter with its own root route, framework
configuration, quality files, and skill selection. Keep `capabilities.routers`
empty because this framework owns routing. Represent rendering support and its
default through adapter capabilities: React Router defaults to SSR, while Astro
continues to default to static output. `--no-ssr` selects React Router prerendering
for `/` and preserves Astro's existing static behavior.

Use `create-react-router@latest` like the other scaffolders, with its default template, `--no-install`, `--no-git-init`,
and `--no-agent-skills`, passing its full branch-qualified GitHub tree URL so
downloads use codeload instead of the rate-limited GitHub API. This leaves dependency installation, git initialization,
and framework skill ownership with purrfold. purrfold fetches the existing
`remix-run/react-router` skill once through its skills pipeline.
Remove the template's Dockerfile and `.dockerignore` just like the welcome
starter; deployment is out of scope.

Keep Bun supported. A real Bun minimal scenario completed the scaffold and its
generated quality gate. React Router's Vite 8 template also requires the
framework-specific `@vitejs/plugin-react` 6.1.2 override when unit tests are on;
the shared 5.1.4 pin supports Vite 7 only.

## Consequences

**Good**: Framework behavior stays behind `FrameworkAdapter`, React Router routes
use the upstream `~/*` alias, and SSR/SSG defaults are explicit and testable.

**Trade-off**: The framework adds a Renovate-managed Vite plugin override and
its own generated-app scenarios. React Router's upstream template may evolve
independently, so nightly E2E against upstream `@latest` catches changes; real
npm and pnpm scenarios cover its files and install behavior.

## Related decisions

- [ADR-0003: Use framework adapters selected by a registry](0003-framework-adapters.md)
- [ADR-0004: Scaffold Vite before initializing shadcn](0004-vite-framework.md)
- [ADR-0005: Model client routers as framework capabilities](0005-router-framework-capability.md)
