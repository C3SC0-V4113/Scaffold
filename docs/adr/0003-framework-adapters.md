# ADR-0003: Use framework adapters selected by a registry

**Status**: Accepted  
**Date**: 2026-10-12

## Context

ADR-0002 introduced a framework registry while purrfold supported Next.js and
Astro. Framework-specific behavior has since spread into the create pipeline,
installers, templates, and the E2E harness. A third framework could silently
fall through to Next.js behavior. Adding Vite and React Router also requires a
stable place for each framework's scaffolder, capabilities, paths, scripts,
templates, skills, and docs.

## Decision

Represent each framework with a typed `FrameworkAdapter` object. The adapter is
the framework port that translates a framework's scaffold and conventions into
the common purrfold pipeline. A small registry acts as a factory: it selects the
adapter for a `Framework` id. `satisfies Record<Framework, FrameworkAdapter>`
ensures every framework id has an adapter at compile time.

The term `FrameworkAdapter` is unrelated to `AstroServerAdapter`, which names
an Astro deployment target such as Node or Cloudflare. The former adapts a
framework to purrfold; the latter adapts Astro output to a hosting platform.

The adapter holds declarative capabilities and layout data alongside behavior
for scaffolding, templates, package scripts, skills, and docs. Existing
installer and template functions remain composed by the adapters so this
refactor changes where framework decisions are made, not generated output.

We use plain typed objects and a simple registry. An Abstract Factory or class
hierarchy would add ceremony without useful variation for the small set of
frameworks supported by purrfold.

## Consequences

**Good**: Framework-specific decisions have an explicit owner; unsupported
capabilities can be validated from data; adding a framework without registering
its adapter fails typechecking. The E2E harness mirrors adapter layout data and
tests that it remains aligned.

**Bad**: Adapter objects span several existing modules, and the plain JavaScript
E2E harness cannot import the TypeScript source directly.

**Mitigation**: Keep renderer implementations in their existing modules and
compose them through adapter methods. Keep a small harness layout table in
`scripts/e2e/catalog.mjs` and assert equality with the TypeScript adapters.
