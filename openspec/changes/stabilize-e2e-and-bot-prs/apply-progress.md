# Apply Progress: Stabilize E2E and Bot PRs

## Combined Task Status

### Phase 1: npm 10 Install Sequencing (Unit 1) — CORRECTED
- [x] 1.1 RED `tests/dry-run.test.ts`: assert npm quality-layer command is `npm install --legacy-peer-deps --save-dev` and appears after shadcn init; pnpm/bun/skip do not run an npm dev-dep install
- [x] 1.2 RED `tests/package-manager.test.ts` and `tests/motion.test.ts`: assert npm `addDev` and `add` include `--legacy-peer-deps`; pnpm/bun commands unchanged
- [x] 1.3 GREEN `src/package-manager.ts`: add `--legacy-peer-deps` to npm `addDev` and `add`; remove ineffective bare `npm install` normalization from `src/commands/create.ts`
- [x] 1.4 REFACTOR: update `scripts/e2e/scenarios.mjs` dry-run expectation; run focused tests and real `npm-default-unit` + `astro-npm-ssg-unit` E2E green

### Phase 2: App Router Lint Override (Unit 2) — COMPLETED
- [x] 2.1 RED `tests/templates.test.ts`: assert Next config override is exactly `app/**/layout.{tsx,jsx,ts,js}` + `app/**/page.{tsx,jsx,ts,js}` with only `react-doctor/only-export-components: 'off'`; Astro config has no `app/**` override; `--max-warnings 0` unchanged
- [x] 2.2 GREEN `src/templates/eslint.ts`: append scoped override block in `renderNextEslintConfig` after reactDoctor presets, before prettier/ignores; never in `renderAstroEslintConfig`
- [x] 2.3 GREEN: update `tests/__snapshots__/templates.test.ts.snap` to reviewed Next config; run `npm test -- tests/templates.test.ts` green
- [x] 2.4 RED `tests/templates.test.ts`: assert Next config with `motion: true` includes a `components/common/motion-main.tsx` override that disables only `react-doctor/jsx-no-new-object-as-prop`; Astro and non-Motion Next configs omit it
- [x] 2.5 GREEN `src/templates/eslint.ts`: add the conditional Motion wrapper override after the App Router metadata override; keep `motion` optional in the template API
- [x] 2.6 REFACTOR: snapshot the Motion-enabled Next ESLint config; verify generated Next Motion project lints cleanly with `eslint-plugin-react-doctor@0.9.12` and `--max-warnings 0`, and that removing either override reproduces the expected warnings

### Phase 3: Nightly Issue Signal (Unit 3)
- [ ] 3.1 RED `tests/nightly-e2e-report.test.ts`: mixed success/failure/cancelled jobs → actionable list with job names, conclusions, job/run URLs, SHA; no actionable jobs → no issue; missing/invalid repo/run/SHA env → fail closed
- [ ] 3.2 RED `tests/cli-e2e-catalog.test.ts`: assert nightly job keeps `if: always() && github.event_name == 'schedule'`, `needs: [scenario, heavy]`, reporter invoked with argv arrays, `permissions: {contents: read, issues: write}`, no inline `gh issue create`
- [ ] 3.3 GREEN `scripts/e2e/nightly-report.mjs`: create reporter via Actions jobs API; argv-array exec, never shell composition; issue only on actionable failures
- [ ] 3.4 GREEN `.github/workflows/e2e.yml`: replace inline issue step with reporter invocation for failed/cancelled scheduled deps; run both test files green

### Phase 4: Verification and Rollout
- [x] 4.1 Real E2E: `node scripts/cli-e2e.mjs --scenario npm-default-unit` and `--scenario astro-npm-ssg-unit`
- [x] 4.2 Run `cmd /c npm run check` (typecheck + tests + build)
- [ ] 4.3 Post-merge observation (no code)

## TDD Cycle Evidence (Strict TDD)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.4 | `tests/templates.test.ts` | Unit | ✅ 34/34 prior tests passing | ✅ Written | ✅ Passed | ✅ motion=true + motion=false + Astro absence cases | ✅ Snapshotted Motion-enabled config |
| 2.5 | `tests/templates.test.ts` | Unit | ✅ 34/34 prior tests passing | ✅ Written (2.4) | ✅ Passed | ✅ N/A (single conditional block) | ✅ Kept `motion` optional, no global rule weakening |
| 2.6 | `tests/templates.test.ts` + runtime | Unit + runtime harness | ✅ 35/35 template tests passing | ✅ N/A (evidence/verification) | ✅ Generated project lint passes | ✅ N/A | ✅ Snapshot + native settle |

### Test Summary
- **Total tests written**: 3 new template tests (Motion wrapper presence, Motion wrapper absence, Motion-enabled snapshot)
- **Total tests passing**: 240 (full suite)
- **Layers used**: Unit, runtime harness
- **Approval tests**: None — no refactoring of existing behavior
- **Pure functions created**: None required; change is conditional template rendering

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npm test -- tests/templates.test.ts` → `Test Files  1 passed (1)` / `Tests  35 passed (35)` |
| Runtime harness command/scenario and exact result | Generated a Next Motion project via `node dist/index.js create <dir> --pm npm --motion --unit --e2e --yes`; bumped `eslint-plugin-react-doctor` and `react-doctor` to `0.9.12`; `npm run lint` → 0 warnings, exit 0. Removing the motion-main override reproduced 3 `react-doctor/jsx-no-new-object-as-prop` warnings on `components/common/motion-main.tsx`. Removing the metadata override reproduced 2 `react-doctor/only-export-components` warnings on `app/layout.tsx` and `app/page.tsx`. |
| Rollback boundary | Revert `src/templates/eslint.ts` (remove conditional motion-main block and optional `motion` field) and `tests/templates.test.ts` / snapshot. The App Router metadata override from 2.1–2.3 remains independent and untouched. |

## Native Attempt Record

- **Change**: `stabilize-e2e-and-bot-prs`
- **Work unit**: `unit-2-react-doctor-0912-completion`
- **Evidence goal**: `react-doctor-0912-generated-lint-clean`
- **Acquire state**: `proceed`
- **Acquire token**: `sha256:bd805b5fc452c5073b37933a97e1152ebf63285fe616cda99b42bca1f2611550`
- **Settle state**: `complete`
- **Evidence revision (passing generated eslint.config.mjs)**: `sha256:ec9d57520353a14a677189610f18ae81bc7cb4db9be0e756440a18b3041073d1`
- **Max attempts**: 1
- **Max changed lines**: 150

## Deviations from Design

None — implementation matches the updated design. The Motion wrapper override is scoped to a single file and a single rule, exactly like the App Router metadata override.

## Issues Found

None. The `cmd /c npm run check` invocation required `MSYS_NO_PATHCONV=1` in the Git Bash environment so that `/c` was not translated to a drive path; the command itself passed.

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `src/templates/eslint.ts` | Modified | Added conditional `components/common/motion-main.tsx` override for `react-doctor/jsx-no-new-object-as-prop`; made `motion` optional in `EslintConfigOptions`. |
| `tests/templates.test.ts` | Modified | Added RED tests for Motion wrapper override presence/absence and snapshot. |
| `tests/__snapshots__/templates.test.ts.snap` | Modified | Recorded Motion-enabled Next ESLint config snapshot. |
| `openspec/changes/stabilize-e2e-and-bot-prs/specs/next-app-router-linting/spec.md` | Modified | Added Motion wrapper requirement and scenarios. |
| `openspec/changes/stabilize-e2e-and-bot-prs/design.md` | Modified | Updated decisions, file changes, interfaces, and testing strategy to include the Motion wrapper override. |
| `openspec/changes/stabilize-e2e-and-bot-prs/tasks.md` | Modified | Marked Unit 2 correction tasks complete. |
| `openspec/changes/stabilize-e2e-and-bot-prs/apply-progress.md` | Created | This combined apply-progress artifact. |

## Status

9 of 14 tasks complete (Unit 1 and Unit 2 done). Unit 3 remains pending. Ready for verify after Unit 3 is implemented.
