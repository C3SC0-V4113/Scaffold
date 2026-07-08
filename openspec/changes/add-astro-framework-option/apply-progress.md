# Apply Progress: Add Astro as a First-Class Framework Option

## Batch 1 — PR1 / Foundation

### Completed Tasks
- [x] 1.1 Add `Framework`/`CreateOptions.framework` and registry contracts in `src/types.ts` and `src/frameworks/registry.ts`.
- [x] 1.2 Update `src/commands/create.ts` and `src/cli.ts` so framework is the first prompt, `--framework <next|astro>` is accepted, and `--yes` defaults to Next.
- [x] 1.3 Mirror framework choices in `src/cli-metadata.ts` and any option/schema rendering.

### TDD Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/create.test.ts` | Unit | ✅ `npm run test -- tests/create.test.ts tests/cli-metadata.test.ts tests/cli-info.test.ts` | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.2 | `tests/create.test.ts` | Unit | ✅ `npm run test -- tests/create.test.ts tests/cli-metadata.test.ts tests/cli-info.test.ts` | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.3 | `tests/cli-metadata.test.ts`, `tests/cli-info.test.ts` | Unit | ✅ `npm run test -- tests/create.test.ts tests/cli-metadata.test.ts tests/cli-info.test.ts` | ✅ Written | ✅ Passed | ✅ 2 assertions | ✅ Clean |

### Notes
- Next.js remains the default framework in this batch.
- Astro scaffolding is intentionally deferred to the next slice.

## Batch 2 — PR3 / Docs, Skills, and Cleanup

### Completed Tasks
- [x] 2.1 Implement `src/installers/astro.ts` and route `runCreate()` through framework selection instead of `createNextApp()` only.
- [x] 2.2 Extend `src/package-manager.ts` and `src/installers/shadcn.ts` for Astro create/init commands, React integration, and Bun rejection for Astro.
- [x] 2.3 Split framework-aware quality/config generation in `src/installers/config-model.ts`, `src/templates/eslint.ts`, `src/installers/quality.ts`, and `src/installers/testing.ts`.
- [x] 2.4 Add ADR `docs/adr/0002-framework-registry-for-astro.md` and reference the framework registry decision in generated guidance.
- [x] 3.1 Update `src/installers/docs.ts` and `src/templates/files.ts` to preserve existing markdown foundations while inserting framework-specific sections.
- [x] 3.2 Update `src/templates/skills.ts`, `src/installers/skills.ts`, and `src/skills/manifest.ts` to filter Next-only guidance, keep shared React skills, and document Astro references without auto-installing them.
- [x] 3.3 Update `README.md`, `llms.txt`, and `skills/purrfold/SKILL.md` so public guidance shows both frameworks and defaults clearly.
- [x] 4.1 Add Vitest coverage for framework prompt/defaults, invalid framework rejection, and CLI metadata/scenario output.
- [x] 4.2 Add dry-run/integration tests for Astro command planning, React/shadcn ordering, and Bun rejection.
- [x] 4.3 Add preservation tests for README/AGENTS/CLAUDE marker-based updates plus skill-selection tests for Next vs Astro outputs.
- [x] 5.1 Verify all generated markdown stays English and the ADR explains the registry tradeoff clearly.
- [x] 5.2 Remove any leftover Next-only assumptions from comments, help text, and generated templates.

### Notes
- Astro docs/skills guidance is additive: existing markdown content is preserved and only framework-specific sections are changed.
- Astro keeps shared React-related skills but drops Next-only workflow skills from auto-installation.
- Skill grouping is now organized as framework-agnostic, React-specific, and framework-specific buckets to keep the installer logic readable.
- Astro now has a catalog entry for `astrolicious/agent-skills` (`astro`) as the framework-specific external skill.
- Astro root layout now injects React Scan via the Vite-style script tag in the `<head>`.
- Astro React Scan is gated to development only, matching the Next.js runtime guard.
