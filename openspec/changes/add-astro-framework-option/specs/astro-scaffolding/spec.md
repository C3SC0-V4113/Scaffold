# Astro Scaffolding Specification

## Purpose

Astro projects are scaffolded as production-ready React-compatible apps without weakening the existing Next.js path.

## Requirements

### Requirement: Astro scaffolding supports shadcn-compatible React

The system MUST create Astro apps through the standard Astro creation path and MUST enable React integration before any shadcn-dependent setup is considered complete.

#### Scenario: Astro app uses React integration

- GIVEN a user selects Astro
- WHEN the scaffold command plan is produced
- THEN Astro creation MUST be used
- AND React integration MUST be included before shadcn setup succeeds

#### Scenario: Astro uses the standard install path

- GIVEN a user selects Astro
- WHEN commands are planned for dry-run or execution
- THEN the plan MUST use the official Astro create/add flow
- AND MUST NOT emulate Astro by mutating a Next.js scaffold

#### Scenario: Astro quality gates are framework-aware

- GIVEN a generated Astro app is configured
- WHEN quality or test commands are generated or documented
- THEN they MUST use Astro-compatible commands
- AND MUST NOT reference Next.js-only commands for Astro

#### Scenario: Bun is not enabled for Astro yet

- GIVEN a user selects Astro with Bun
- WHEN options are validated or commands are planned
- THEN creation MUST fail or clearly report that Bun is unsupported for Astro in this slice
- AND npm/pnpm Astro command generation MUST remain testable

## Acceptance Criteria

- Astro scaffolds with React integration and shadcn-compatible setup expectations.
- Dry-run/tests cover Astro routing, invalid framework handling, and package-manager command generation.
- Astro does not claim Bun support until implementation and verification explicitly add it.

## Non-goals

- Supporting non-React Astro integrations.
- Adding frameworks beyond Next.js and Astro.
- Replacing current installers with a full plugin system.
