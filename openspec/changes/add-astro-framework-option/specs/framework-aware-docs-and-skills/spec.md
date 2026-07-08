# Framework-Aware Docs and Skills Specification

## Purpose

Generated metadata, docs, skills, and catalog guidance tell the truth for both supported frameworks.

## Requirements

### Requirement: Public guidance is dual-framework

The system MUST update CLI metadata, README/llms guidance, generated docs, skills, and catalog content to describe Next.js and Astro behavior from the start.

#### Scenario: Metadata lists both frameworks

- GIVEN CLI option metadata or scenario catalog is queried
- WHEN framework-related content is rendered
- THEN it MUST list Next.js and Astro
- AND identify Next.js as the default

#### Scenario: Generated docs match selected framework

- GIVEN a project is generated for Astro
- WHEN README, AGENTS, CLAUDE, or installed skills are rendered
- THEN framework-specific instructions MUST match Astro
- AND shared guidance MUST not claim the project is Next.js-only

#### Scenario: Existing markdown intent is preserved

- GIVEN README, AGENTS, or CLAUDE templates contain existing guidance
- WHEN framework-aware variants are introduced
- THEN unrelated markdown content MUST be preserved
- AND only framework-specific wording SHOULD change

#### Scenario: Catalog references remain non-installing

- GIVEN catalog or skill guidance mentions Astro support
- WHEN community Astro skill references are rendered
- THEN they MAY cite the candidate reference for discovery
- AND MUST NOT install it automatically in this change

### Requirement: ADR guidance remains available

The system MUST preserve architecture decision record guidance for generated projects regardless of selected framework.

#### Scenario: ADR requirement survives framework branching

- GIVEN a user generates either Next.js or Astro
- WHEN docs and skills are installed
- THEN ADR guidance MUST remain available
- AND framework-specific skill changes MUST NOT remove the ADR requirement

## Acceptance Criteria

- CLI metadata, README, llms.txt, generated skills/docs, and catalog guidance consistently describe both frameworks.
- README/AGENTS/CLAUDE markdown is preserved except for intentional framework-aware edits.
- ADR guidance remains present for both framework paths.

## Non-goals

- Automatically installing community Astro skills in this change.
- Rewriting generated docs unrelated to framework selection.
