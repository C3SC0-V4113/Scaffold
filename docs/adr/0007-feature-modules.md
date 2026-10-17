# ADR-0007: Model optional behavior as feature modules

**Status**: Accepted  
**Date**: 2026-10-16

## Context

`FrameworkAdapter` describes framework-specific scaffolding, paths, configuration,
and conventions (ADR-0003). Optional behavior such as Motion also needs to
contribute dependencies, generated files, documentation, skills, lint rules,
and diagnostics. Keeping those contributions on each framework adapter makes
every adapter aware of every optional feature.

## Decision

Represent optional behavior with ordered `FeatureModule` objects in
`src/features/`. A feature module declares when it is enabled and contributes
its installers, files, skills, docs, lint fragments, and diagnostic rules.
When contributions depend on a framework, the module owns a typed
`Record<Framework, ...>` so new frameworks must be considered by each feature.
The create pipeline runs enabled installers at the existing feature install
point, and shared generators aggregate the other contributions.

Framework adapters remain responsible for framework conventions and may pass
ordinary feature flags into framework-owned templates where needed.

## Consequences

**Good**: Adding optional behavior no longer requires feature-specific fields
on every framework adapter. Feature output remains testable through the shared
executor and generator pipeline.

**Bad**: A feature can contribute to several generation stages, so its module
and registry must keep those contributions ordered and coordinated.

**Mitigation**: Keep contributions in one module, preserve the established
pipeline position, and validate generated output and dry-run operations against
the previous release behavior.
