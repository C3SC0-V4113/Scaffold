# Framework Selection Specification

## Purpose

Users choose the scaffold framework explicitly while existing Next.js behavior remains the default path.

## Requirements

### Requirement: Framework choice is first-class

The CLI MUST expose framework selection in interactive and non-interactive creation, supporting `next` and `astro`, with `next` as the default.

#### Scenario: Interactive prompt starts with framework

- GIVEN a user runs create without `--yes`
- WHEN prompts begin
- THEN the first setup choice MUST ask for framework
- AND options MUST include Next.js and Astro with Next.js defaulted

#### Scenario: Next.js default stays stable

- GIVEN a user runs create with existing default behavior such as `--yes`
- WHEN no framework is specified
- THEN the generated app MUST use Next.js
- AND existing Next.js option semantics MUST remain compatible

#### Scenario: Invalid framework is rejected

- GIVEN a user passes an unsupported framework value
- WHEN options are validated
- THEN creation MUST fail with an actionable framework error

## Acceptance Criteria

- Users can select Next.js or Astro from the first interactive prompt.
- `--yes` and unspecified framework still generate Next.js.
- Invalid framework input fails before scaffold commands run.

## Non-goals

- Retrofitting existing generated projects.
- Replacing the create flow with framework subcommands.
