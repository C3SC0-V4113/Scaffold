# ADR-0002: Add a framework registry for Astro support

**Status**: Accepted
**Date**: 2026-07-08

## Context

purrfold started as a Next.js-only scaffold. Adding Astro required a place to encode framework-specific defaults without breaking the existing Next.js flow or scattering conditionals across the CLI.

## Decision

Introduce an explicit `framework` choice (`next` / `astro`) and use it to route scaffold commands, quality files, docs, and skills.

Keep Next.js as the default and treat Astro as an explicit opt-in path.

## Consequences

**Good**: framework-specific behavior stays centralized, the default path remains stable, and future frameworks can reuse the same seam.

**Bad**: templates, skills, and tests now need framework-aware branches.

**Mitigation**: keep shared guidance additive and preserve markdown content with minimal, framework-specific edits.
