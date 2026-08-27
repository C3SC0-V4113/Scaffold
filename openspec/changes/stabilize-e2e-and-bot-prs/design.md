# Design: Stabilize E2E and Bot PRs

## Technical Approach

Treat the failures as three independent boundaries. The create orchestrator will route npm dependency installs through `--legacy-peer-deps` so npm 10's peer-dependency resolver does not crash with `edgesOut` when quality dependencies are added after `shadcn init`; the Next-only ESLint template will exempt App Router layout/page exports and the generated Motion wrapper from a single rule each, and the Astro template will mirror the Motion wrapper override at its generated `src/components/common/motion-main.tsx` path; and the nightly workflow will delegate issue rendering to a testable script that reports concrete failed jobs. npm remains supported at version 10, `react-doctor` and `--max-warnings 0` remain unchanged, and Renovate changeset automation is out of scope.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Add a bare `npm install` normalization step after `initializeShadcn` | Preserves the exact npm command shape but only reifies the lockfile; the subsequent `npm install --save-dev` still crashes on npm 10 with `edgesOut` | Reject; the crash is not an ordering problem |
| Pass `--legacy-peer-deps` to npm `install` invocations that add packages | Changes the npm command shape for generated-app installs but avoids the npm 10 peer-dep resolver crash | Adopt for npm `addDev` and `add`; pnpm/bun unchanged |
| Downgrade/disable React Doctor broadly | Avoids the warning but loses current diagnostics | Reject; add Next flat-config overrides for the two specified App Router globs and the generated Motion wrapper, each disabling exactly one rule, and mirror the Motion wrapper override for Astro |
| Keep generic nightly issue text | Simple but forces maintainers to inspect every job | Reject; query the run jobs and list failed/cancelled job names, conclusions, URLs, SHA, and run URL |

## Data Flow

```text
scaffolder -> shadcn init -> npm install --legacy-peer-deps --save-dev <quality deps> -> generated check
Next/Astro options -> renderEslintConfig -> scoped App Router (Next) and Motion wrapper (Next/Astro) overrides -> strict generated lint
scheduled failure -> nightly-report script -> Actions jobs API -> actionable GitHub issue
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/package-manager.ts` | Modify | Add `--legacy-peer-deps` to npm `addDev` and `add` commands. |
| `src/commands/create.ts` | Modify | Remove the ineffective bare `npm install` normalization step. |
| `tests/dry-run.test.ts` | Modify | Assert npm quality-layer and Motion installs include `--legacy-peer-deps`; assert pnpm/bun/skip are unchanged. |
| `tests/package-manager.test.ts` | Modify | Assert npm `addDev`/`add` include `--legacy-peer-deps`. |
| `tests/motion.test.ts` | Modify | Assert npm Motion install includes `--legacy-peer-deps`. |
| `scripts/e2e/scenarios.mjs` | Modify | Update `dry-run-motion-next-npm` expected output to include `--legacy-peer-deps`. |
| `src/templates/eslint.ts` | Modify | Add Next-only layout/page override and conditional Motion wrapper overrides (Next `components/common/motion-main.tsx`, Astro `src/components/common/motion-main.tsx`) after React Doctor presets. |
| `tests/templates.test.ts` | Modify | Assert exact override scope, Astro absence of Next-only overrides, strict lint retention, and Motion-only wrapper overrides for both Next and Astro. |
| `scripts/e2e/nightly-report.mjs` | Create | Select actionable job failures and render/create the nightly issue using argv arrays, never shell composition. |
| `tests/nightly-e2e-report.test.ts` | Create | Unit-test job filtering, body content, and missing/invalid context failures. |
| `.github/workflows/e2e.yml` | Modify | Invoke the reporter only for scheduled failed/cancelled dependencies. |
| `tests/cli-e2e-catalog.test.ts` | Modify | Assert the nightly job's `always()` gate, needs, reporter invocation, and permissions. |

## Interfaces / Contracts

- npm dependency additions (`addDev` and `add`) MUST execute as `npm install --legacy-peer-deps --save-dev <packages>` or `npm install --legacy-peer-deps <packages>` with `cwd: projectRoot`; pnpm/bun commands MUST NOT change.
- The bare `npm install` normalization step MUST be removed; it does not prevent the npm 10 `edgesOut` crash.
- Next config files MUST include exactly `app/**/layout.{tsx,jsx,ts,js}` and `app/**/page.{tsx,jsx,ts,js}` with `react-doctor/only-export-components` `off`; when Motion is enabled, Next `components/common/motion-main.tsx` and Astro `src/components/common/motion-main.tsx` MUST also have `react-doctor/jsx-no-new-object-as-prop` `off` and no other rule changes.
- The reporter accepts GitHub's repository/run/SHA/server environment plus the jobs API payload. It fails closed without valid context and opens no issue when no actionable jobs exist.

## Testing Strategy

Strict RED-GREEN-REFACTOR order:

| Layer | RED proof | Green/verification |
|---|---|---|
| Integration | Assert npm quality-layer and Motion commands include `--legacy-peer-deps`; assert pnpm/bun/skip negatives | Update `package-manager.ts` and remove normalization; run `npm test -- tests/dry-run.test.ts tests/package-manager.test.ts tests/motion.test.ts` |
| Unit/template | Assert exact Next overrides (metadata + Motion wrapper), Astro Motion wrapper, Astro absence of Next-only overrides, and unchanged `--max-warnings 0` before rendering them | Update template; run `npm test -- tests/templates.test.ts` |
| Unit/workflow | Feed mixed successful/failed/cancelled jobs and assert actionable links; assert schedule-only workflow wiring | Implement reporter/workflow; run both reporter and catalog tests |
| Real E2E | Existing metadata exports and Motion wrapper must fail before the overrides | Run generated Next and Astro Motion projects with `eslint-plugin-react-doctor@0.9.12`, then `cmd /c npm run check` |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED tests |
|---|---|---|---|
| Package-manager subprocess | Applicable | Fixed argv/cwd; npm-only `--legacy-peer-deps`; pnpm/bun unchanged; propagate non-zero exit | npm `--legacy-peer-deps` presence, pnpm/bun/skip absence |
| Documentation-like paths | N/A: no executable classification | — | — |
| Git repository selection | N/A: no Git command added | — | — |
| Commit state | N/A: no commit operation added | — | — |
| Push state | N/A: no push automation added | — | — |
| PR commands | N/A: rollout uses bot-native refresh, not implemented command composition | — | — |

## Migration / Rollout

No data migration. Merge only after focused tests, both real npm scenarios, and `npm run check` pass. Observe the next scheduled run; do not manually rerun it. Then refresh bot PRs #76, #77, #78, and #69 one at a time via each bot's native refresh/recreate mechanism, never local force-push. Record the old head, verify the refreshed diff remains dependency-only, and wait for every required check before continuing. Stop on conflict, unexpected diff, or any non-policy failure. For #69, leave the expected changeset-guard failure untouched; Renovate changeset automation/fix remains separate work.

## Open Questions

None.
