# Tasks: Add Astro as a First-Class Framework Option

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 framework prompt + registry, PR 2 Astro scaffold + shadcn, PR 3 docs/skills/ADR + tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Framework selection + command registry | PR 1 | Base branch; validate `next|astro`, first-prompt flow, Next default, invalid framework guard |
| 2 | Astro scaffolding + React/shadcn wiring | PR 2 | Base = PR 1; add Astro create path, bun rejection, Astro quality/deps/scripts |
| 3 | Docs/skills/ADR + verification | PR 3 | Base = PR 2; preserve markdown foundations, update catalog guidance, add ADR, tests |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Add `Framework`/`CreateOptions.framework` and registry contracts in `src/types.ts` and `src/frameworks/registry.ts`.
- [x] 1.2 Update `src/commands/create.ts` and `src/cli.ts` so framework is the first prompt, `--framework <next|astro>` is accepted, and `--yes` defaults to Next.
- [x] 1.3 Mirror framework choices in `src/cli-metadata.ts` and any option/schema rendering.

## Phase 2: Core Implementation

- [x] 2.1 Implement `src/installers/astro.ts` and route `runCreate()` through framework selection instead of `createNextApp()` only.
- [x] 2.2 Extend `src/package-manager.ts` and `src/installers/shadcn.ts` for Astro create/init commands, React integration, and Bun rejection for Astro.
- [x] 2.3 Split framework-aware quality/config generation in `src/installers/config-model.ts`, `src/templates/eslint.ts`, `src/installers/quality.ts`, and `src/installers/testing.ts`.
- [x] 2.4 Add ADR `docs/adr/0002-framework-registry-for-astro.md` and reference the framework registry decision in generated guidance.

## Phase 3: Integration / Wiring

- [x] 3.1 Update `src/installers/docs.ts` and `src/templates/files.ts` to preserve existing markdown foundations while inserting framework-specific sections.
- [x] 3.2 Update `src/templates/skills.ts`, `src/installers/skills.ts`, and `src/skills/manifest.ts` to filter Next-only guidance, keep shared React skills, and document Astro references without auto-installing them.
- [x] 3.3 Update `README.md`, `llms.txt`, and `skills/purrfold/SKILL.md` so public guidance shows both frameworks and defaults clearly.

## Phase 4: Testing / Verification

- [x] 4.1 Add Vitest coverage for framework prompt/defaults, invalid framework rejection, and CLI metadata/scenario output.
- [x] 4.2 Add dry-run/integration tests for Astro command planning, React/shadcn ordering, and Bun rejection.
- [x] 4.3 Add preservation tests for README/AGENTS/CLAUDE marker-based updates plus skill-selection tests for Next vs Astro outputs.

## Phase 5: Cleanup / Documentation

- [x] 5.1 Verify all generated markdown stays English and the ADR explains the registry tradeoff clearly.
- [x] 5.2 Remove any leftover Next-only assumptions from comments, help text, and generated templates.
