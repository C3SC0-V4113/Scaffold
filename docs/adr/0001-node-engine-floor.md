# ADR-0001: Raise the Node engine floor to 22.13.0

**Status**: Accepted
**Date**: 2026-07-07

## Context

Dependabot upgraded `commander` and `@inquirer/prompts` to major versions that no longer support the project's declared Node floor of `>=20.9.0`.
The repo's CI runs Node 22, so the mismatch was not visible in the quality gate, but it would mislead end users on Node 20.x.

## Decision

Raise `package.json` `engines.node` to `>=22.13.0` and keep the OpenSpec runtime metadata aligned with that floor.

## Consequences

**Good**: the published contract matches the installed dependency floor; future Dependabot updates are less likely to create hidden engine drift.

**Bad**: users on Node 20.x will now receive an engine warning and should upgrade before using the CLI.

**Mitigation**: document the floor in the changelog and keep a regression test that asserts the declared engine value.
