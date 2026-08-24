# Tasks: Stabilize E2E and Bot PRs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450–550 (full change); Unit 1 correction ~40 |
| 400-line budget risk | High (full change); Low (Unit 1 correction) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes — resolved to stacked-to-main
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High (full change)

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | npm 10 peer-dep workaround | PR 1 | `npm test -- tests/dry-run.test.ts tests/package-manager.test.ts tests/motion.test.ts` | `node scripts/cli-e2e.mjs --scenario npm-default-unit` and `--scenario astro-npm-ssg-unit` | Revert `package-manager.ts` npm flags + remove test updates |
| 2 | App Router lint override | PR 2 | `npm test -- tests/templates.test.ts` | `node scripts/cli-e2e.mjs --scenario astro-npm-ssg-unit` + npm-default-unit | Revert `eslint.ts` + template tests/snapshot |
| 3 | Actionable nightly issue signal | PR 3 | `npm test -- tests/nightly-e2e-report.test.ts tests/cli-e2e-catalog.test.ts` | N/A — reporter runs only under Actions schedule context; design forbids manual reruns; wiring locked by catalog test | Revert `nightly-report.mjs` + e2e.yml job + tests |

## Phase 1: npm 10 Install Sequencing (Unit 1) — CORRECTED

> **Correction note:** The initial Phase 1 implementation added a bare `npm install` normalization step after `shadcn init`. Real E2E evidence on npm 10.9.x showed this step succeeded but the subsequent `npm install --save-dev <quality deps>` still crashed with `Cannot read properties of null (reading 'edgesOut')`. The root cause is npm 10's peer-dependency resolver, not lockfile ordering. The corrected fix passes `--legacy-peer-deps` to npm `addDev`/`add` commands and removes the ineffective normalization step.

- [x] 1.1 RED `tests/dry-run.test.ts`: assert npm quality-layer command is `npm install --legacy-peer-deps --save-dev` and appears after shadcn init; pnpm/bun/skip do not run an npm dev-dep install
- [x] 1.2 RED `tests/package-manager.test.ts` and `tests/motion.test.ts`: assert npm `addDev` and `add` include `--legacy-peer-deps`; pnpm/bun commands unchanged
- [x] 1.3 GREEN `src/package-manager.ts`: add `--legacy-peer-deps` to npm `addDev` and `add`; remove ineffective bare `npm install` normalization from `src/commands/create.ts`
- [x] 1.4 REFACTOR: update `scripts/e2e/scenarios.mjs` dry-run expectation; run focused tests and real `npm-default-unit` + `astro-npm-ssg-unit` E2E green

## Phase 2: App Router Lint Override (Unit 2)

- [ ] 2.1 RED `tests/templates.test.ts`: assert Next config override is exactly `app/**/layout.{tsx,jsx,ts,js}` + `app/**/page.{tsx,jsx,ts,js}` with only `react-doctor/only-export-components: 'off'`; Astro config has no `app/**` override; `--max-warnings 0` unchanged (spec reqs 1–3)
- [ ] 2.2 GREEN `src/templates/eslint.ts`: append scoped override block in `renderNextEslintConfig` after reactDoctor presets, before prettier/ignores; never in `renderAstroEslintConfig`
- [ ] 2.3 GREEN: update `tests/__snapshots__/templates.test.ts.snap` to reviewed Next config; run `npm test -- tests/templates.test.ts` green

## Phase 3: Nightly Issue Signal (Unit 3)

- [ ] 3.1 RED `tests/nightly-e2e-report.test.ts`: mixed success/failure/cancelled jobs → actionable list with job names, conclusions, job/run URLs, SHA; no actionable jobs → no issue; missing/invalid repo/run/SHA env → fail closed (design: fail closed, no issue when nothing actionable)
- [ ] 3.2 RED `tests/cli-e2e-catalog.test.ts`: assert nightly job keeps `if: always() && github.event_name == 'schedule'`, `needs: [scenario, heavy]`, reporter invoked with argv arrays, `permissions: {contents: read, issues: write}`, no inline `gh issue create`
- [ ] 3.3 GREEN `scripts/e2e/nightly-report.mjs`: create reporter via Actions jobs API; argv-array exec, never shell composition; issue only on actionable failures
- [ ] 3.4 GREEN `.github/workflows/e2e.yml`: replace inline issue step with reporter invocation for failed/cancelled scheduled deps; run both test files green

## Phase 4: Verification and Rollout (all units)

- [x] 4.1 Real E2E: `node scripts/cli-e2e.mjs --scenario npm-default-unit` and `--scenario astro-npm-ssg-unit`
- [x] 4.2 Run `cmd /c npm run check` (typecheck + tests + build)
- [ ] 4.3 Post-merge (no code, no GitHub-state edits): observe next scheduled E2E run green; then refresh bot PRs #76/#77/#78/#69 via bot-native refresh, verifying dependency-only diffs; leave #69 changeset-guard failure untouched (Renovate automation deferred)
