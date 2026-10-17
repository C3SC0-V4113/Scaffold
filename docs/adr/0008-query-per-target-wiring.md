# ADR-0008: Wire TanStack Query per generated target

- Status: Accepted
- Date: 2026-10-16

## Context

The `--query` feature spans applications with different rendering and routing lifecycles. Next.js and React Router framework mode render on the server, Astro mounts independent React islands, and Vite can run without a router or use React Router's data APIs. A single framework adapter change would mix optional feature behavior into framework setup and would encourage one cache lifetime for targets that have different server semantics.

## Decision

Implement TanStack Query as a `FeatureModule`, and select generated files and entry-point patches from a typed framework map plus the Vite router choice. Server-rendered providers create a `QueryClient` with `useState` per render/request. Astro islands use a browser singleton so their separate React roots can share a cache; Astro pages remain outside React context. Vite data-router loaders use the exported client with `ensureQueryData`.

The feature owns its generated documentation, lint contribution, skills, and files. The CLI option is opt-in and defaults off for both interactive and `--yes` flows.

## Consequences

- Framework adapters remain unaware of TanStack Query.
- Each target can follow its rendering lifecycle while sharing the same feature-level install and lint integration.
- New optional feature documentation is composed by modules rather than hardcoded template headings.
- Adding another target requires explicit path and wiring coverage in the feature tests and E2E catalog.
