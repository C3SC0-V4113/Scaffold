# Exploration: stabilize-e2e-and-bot-prs

Change key: `stabilize-e2e-and-bot-prs`
Author role: sdd-explore (research only; no source changes)

## Scope of investigation

Identify root causes and the safe remediation order for the failures blocking:

- bot PR #76 (`@inquirer/prompts` 8.5.2 → 8.6.0)
- bot PR #77 (CLOSED dev-dependencies group, `@types/node` 26.1.2 → 26.2.0, `tsx` 4.23.9 → 4.23.12, `vitest` 4.1.10 → 4.1.11)
- bot PR #78 (OPEN dev-dependencies group, adds `@changesets/cli` 3.0.0 → 3.0.1 to the same set)
- renovate PR #69 (generated-app pins non-major — bumps `react-doctor`/`eslint-plugin-react-doctor` 0.9.11 → 0.9.12, plus other Astro/dev pins in `src/versions.json`)
- recent nightly E2E schedule runs (32555180657, 32452052571, 32621256017 all `failure`)

Investigate under `scripts/changeset-rules.mjs` policy and the AGENTS.md rule that pin bumps ship a changeset in the same PR.

## Current State

The CI gate is `npm run check` (typecheck + vitest + tsup build) plus `.github/workflows/e2e.yml`, which fans the scenario matrix in `scripts/e2e/scenarios.mjs` to one job per real scenario per runner. The matrix is forced on every PR (`pull_request:` with no path filter), and the `e2e-ok` summary job is the only E2E check required by branch protection — scenario jobs are dynamic and cannot be required by name (per AGENTS.md).

The install pipeline in `src/commands/create.ts` runs `createNextApp`/`createAstroApp` → `initializeShadcn` → `installQualityLayer` (see `runCreate` lines 210–225). `installQualityLayer` at `src/installers/quality.ts:285-289` calls:

```ts
const install = commands.addDev(buildDevDependencies(options));
await executor.run(install.command, install.args, { cwd: projectRoot });
```

For npm this becomes `npm install --save-dev <list>` (`src/package-manager.ts:94`). For pnpm/bun it is `pnpm add -D <list>` / `bun add -d <list>`.

`scripts/changeset-guard.mjs` enforces that any PR touching `src/versions.json` also adds a `.changeset/*.md`. Decision logic in `scripts/changeset-rules.mjs` is unit-tested and intentionally returns `ok: false, status: 'missing-changeset'` for pin-bump PRs without a changeset.

`package.json` ships `react-doctor` and `eslint-plugin-react-doctor` at the version pinned in `src/versions.json`; the generated `eslint.config.mjs` (rendered by `src/templates/eslint.ts`) loads `reactDoctor.configs.recommended` plus `reactDoctor.configs.next` (for Next) without exempting Next.js metadata exports in `app/**`. The generated `app/layout.tsx` and `app/page.tsx` always export `metadata` alongside the default component (see `src/templates/files.ts:163, 203`).

The CI runner is Node 22 with the runner-bundled npm (10.9.8 on `ubuntu-latest` at the time of these runs, observed in `npm-default-unit (ubuntu-latest)` job 97182149630). The `pnpm/action-setup` action installs pnpm 10 in pnpm jobs; bun is installed via `oven-sh/setup-bun@v2.2.0`.

## Findings (with citations)

### Failure A — npm `Cannot read properties of null (reading 'edgesOut')` after `shadcn init`

Symptoms (cited from run 32634504961, PR #76):

```
- Preflight checks.
✔ Preflight checks.
…
- Updating app/globals.css
✔ Updating app/globals.css
npm error Cannot read properties of null (reading 'edgesOut')
npm error A complete log of this run can be found in: /home/runner/work/_temp/purrfold-e2e-cache/npm/_logs/2026-08-23T10_44_00_739Z-debug-0.log
Command failed with exit code 1: npm install --save-dev 'eslint@9.39.5' 'eslint-config-next@16.3.0' 'eslint-config-prettier@10.1.8' …
```

Same payload on `npm-default-unit` jobs 97182149578 (macOS), 97182149599 (windows), 97182149630 (ubuntu), and on `astro-npm-ssg-unit` jobs 97182149637/641/761 for the same run. Identical text in run 32690953586 (PR #69), 32634521343 (PR #77), 32691026735 (PR #78), and schedule runs 32555180657 / 32452052571 / 32621256017.

Sequence when this fires:

1. `createNextApp`/`createAstroApp` runs `npx create-next-app@latest … --use-npm --yes` which internally runs `npm install` (CI log shows `added 365 packages, and audited 366 packages in 18s` then a working tree with `package-lock.json`).
2. `initializeShadcn` runs `npx shadcn@latest init --defaults`. The log shows shadcn reaches `✔ Updating app/globals.css` before the crash — so shadcn has finished writing files and has just invoked its own `npm install --save-dev` to apply its deps (the "Installing dependencies" / "Installing dependencies" lines).
3. `installQualityLayer` then runs purrfold's own `npm install --save-dev <big list>` (`src/installers/quality.ts:285-289`), and that is where `edgesOut` is read off a node whose value is `null`.

Why this is a class bug, not a transient: the failure reproduces across PRs whose only diff is `package-lock.json` (PRs #77, #78, #76), across PRs whose only diff is `src/versions.json` (PR #69), and across nightly runs against `create-next-app@latest`/`shadcn@latest` (32555180657 etc.). The package list and runner image are constant; only the diff content changes. The common factor is that `npm install --save-dev` is invoked after `shadcn init` already wrote and resolved a partial `package-lock.json`.

The error is a known npm 10.x bug pattern: after one npm operation reifies a `package-lock.json`, a subsequent `npm install`/`npm install --save-dev` reads a node from the graph where `edgesOut` is `null` (npm-cli issue #7963 et al.). npm 11+ fixed the read path. The local sandbox runs npm `11.16.0` (`node --version`/`npm --version`) which is why local runs do not surface it; CI is pinned to the runner image's npm 10.x.

Pnpm and bun scenarios pass because `pnpm add -D` and `bun add -d` do not re-use npm's lockfile or reify graph; they write their own. This is why `pnpm-b2-e2e`, `pnpm-b3-commitlint`, `bun-b5-minimal` succeed on PRs #77/#78 but fail on PR #69 — see Failure B below.

### Failure B — `react-doctor/only-export-components` warnings → `--max-warnings 0` exit 1

PR #69 only. `npm-b1-no-tests`, `pnpm-b2-e2e`, `pnpm-b3-commitlint` (all three OSes), `bun-b5-minimal` jobs in run 32690953586 fail with:

```
/tmp/purrfold-e2e-…/app/layout.tsx
  18:14  warning  This file exports non-components, so Fast Refresh can't safely preserve component state  react-doctor/only-export-components
/tmp/purrfold-e2e-…/app/page.tsx
   5:14  warning  This file exports non-components, so Fast Refresh can't safely preserve component state  react-doctor/only-export-components
✖ 2 problems (0 errors, 2 warnings)
…
ELSLint found too many warnings (maximum: 0).
```

The script is the generated `lint: 'eslint . --no-warn-ignored --max-warnings 0'` (`src/installers/config-model.ts:144` and `:184`). The 0.9.12 bump is the only difference: PR #69 changes `src/versions.json` to set `react-doctor` 0.9.11 → 0.9.12 and `eslint-plugin-react-doctor` 0.9.11 → 0.9.12; PRs #77/#78 do not touch `src/versions.json` and therefore do not see the new rule behaviour. The scaffolded `app/layout.tsx:18` is `export const metadata: Metadata = { … }` and `app/page.tsx:5` is the same pattern (`src/templates/files.ts:163, 203`). The generated `eslint.config.mjs` does not add a `react-doctor/only-export-components` override for `app/**` (see `src/templates/eslint.ts:23-24, 49-138` for Next; `:164-170, 201-…` for Astro).

This is a real product regression if shipped: every `purrfold@latest` user will see two fresh lint warnings on a brand-new scaffold, and the strict `lint` script makes CI fail by design.

### Failure C — Renovate PR violates the changeset-guard policy

PR #69 changes `src/versions.json` and is the only file in the PR diff (GitHub API confirms exactly one file, `+15 -15`). The changeset-guard job in `.github/workflows/ci.yml:41-62` runs `scripts/changeset-guard.mjs`, which calls `evaluateChangesetGuard({ changedFiles: ['src/versions.json'], addedFiles: [] })` from `scripts/changeset-rules.mjs:44-64`. That returns `{ ok: false, status: 'missing-changeset', … }` and the job exits 1 — confirmed in run 32690953547, job 97324394678 (FAILURE).

The local repo has a commit `9be1f46 chore(changeset): record generated app pin updates` on top of `e187329 chore(deps): update generated-app pins (non-major)` (the PR's tip), and a `.changeset/weekly-generated-pins.md` already exists on disk. That commit has not been pushed: GitHub still sees the PR HEAD as `e187329` and the diff is only `src/versions.json`. PRs #76/#77/#78 pass the changeset-guard because their diffs only touch `package-lock.json` — `PIN_FILE` is `src/versions.json`, and the guard's `no-pin-change` branch returns OK in that case.

### Failure D — Nightly schedule E2E shares Failure A root cause

Schedule runs 32621256017, 32555180657, 32452052571 all fail on the same set of scenarios as the bot PRs (`npm-default-unit` and `astro-npm-ssg-unit` on all three OSes, plus `heavy scenarios`). The matrix and `e2e-ok` summary are unchanged; the trigger is `cron: '23 5 * * *'` and there is no upstream code change, so the cause is the same `npm install --save-dev` lockfile half-state from shadcn, against `create-next-app@latest` and `shadcn@latest`. Nightly reports automatically open an issue (`nightly-report` job in `.github/workflows/e2e.yml:245-261`) — no remediation has landed in the window between these runs.

### Cross-cutting observations

- All four failures are independent. A is a purrfold-source install-order bug that affects every PR running real scenarios; B is a single renovate pin bump that introduces a stricter lint rule and the scaffold does not accommodate; C is a renovate bot behaviour gap; D is A under the schedule trigger.
- Failure A does not depend on the PR's content (PR #76 only touches `package-lock.json`; PR #69 only touches `src/versions.json`). Failure B does depend on PR content (it shows up because PR #69 bumps `react-doctor`).
- Failure A is a runner-version problem made worse by purrfold's install sequencing: the runner ships npm 10.x and purrfold issues `npm install` (via shadcn) followed by `npm install --save-dev` (via `installQualityLayer`). The pnpm and bun sequences use the matching package manager end-to-end and do not exhibit this.
- Failure B's regression is masked by the test pyramid: `tests/dry-run.test.ts` covers command sequencing and `tests/templates.test.ts:186` covers `export const metadata` as a substring, but no test executes the generated `lint` script end-to-end against a scaffolded app — the failure mode is reachable only via the real scenario matrix.

## Affected Areas

- `src/commands/create.ts` — install sequencing (`runCreate` calls `createNextApp/createAstroApp` → `initializeShadcn` → `installQualityLayer`).
- `src/installers/quality.ts` — `installQualityLayer` line 285-289 calls `commands.addDev` unconditionally when `!options.skipInstall`; no normalization step between shadcn and this call.
- `src/installers/shadcn.ts` — `initializeShadcn` runs `npx shadcn@latest init --defaults` with no flag to skip its own install. Shadcn does not expose a stable `--no-install` flag in current versions; the relevant knob is `--cwd` plus the registry behavior.
- `src/package-manager.ts:94` — npm `addDev` definition (`npm install --save-dev <pkgs>`). The lockfile half-state originates between this and the upstream shadcn install.
- `src/templates/eslint.ts` — `renderNextEslintConfig` / `renderAstroEslintConfig` pull `reactDoctor.configs.recommended` (and `.next` for Next) without a per-file override that suppresses `only-export-components` for `app/**/layout.{tsx,jsx}` and `app/**/page.{tsx,jsx}` (and Astro equivalents).
- `src/templates/files.ts:163-184, 199-214` — generated `app/layout.tsx` and `app/page.tsx` always export `metadata` alongside the default component.
- `src/installers/config-model.ts:144, 184` — generated `lint` script with `--max-warnings 0`. (Will need to stay strict once the eslint override exists.)
- `scripts/changeset-guard.mjs` + `scripts/changeset-rules.mjs` — already enforced; Failure C is purely the renovate bot not generating a changeset.
- `.github/workflows/ci.yml:41-62` — runs the guard; no change required.
- `.github/workflows/e2e.yml` — schedule and matrix; no change required.
- `src/versions.json` — `react-doctor` 0.9.11 → 0.9.12 pin in PR #69 is the trigger for Failure B.

## Approaches

### A. Fix the npm install sequencing in purrfold (root cause for Failure A and D)

Insert a normalization step between `initializeShadcn` and `installQualityLayer` that refreshes the lockfile state. Three concrete shapes:

1. **Run `npm install` first, then `npm install --save-dev`.** After shadcn finishes, issue `npm install` (no args) so npm re-reads and reifies the lockfile before purrfold adds its dev deps. Cheap and self-contained; only needed when `packageManager === 'npm'`.
2. **Drop the lockfile before the dev install.** `rm package-lock.json && npm install --save-dev <list>`. Forces a fresh resolution; trades time for safety. Should be guarded to npm only.
3. **Bump the runner's npm to 11.x.** Pin `actions/setup-node@v7.0.0` with a specific npm version (`npm i -g npm@11` after setup) in `.github/workflows/e2e.yml`. This is a workflow-only fix that does not change purrfold source but does not help downstream users who scaffold with npm 10.x on their own machines.

Tradeoffs:

| Variant | Effort | Risk | Helps downstream users |
| --- | --- | --- | --- |
| A1 (npm install then npm install --save-dev) | Low | Low — idempotent, no lockfile deletion | Yes — npm 10 users get the same fix |
| A2 (rm lockfile) | Low | Medium — changes lockfile shape; CI cache key changes | Yes |
| A3 (bump runner npm) | Low | Low but only fixes CI, not user scaffolds | No |

Recommended: **A1** as primary, **A3** as belt-and-braces. They compose. A2 is a last resort.

### B. Make the lint config tolerate Next.js metadata exports (root cause for Failure B)

In `src/templates/eslint.ts`, after pulling in `reactDoctor.configs.recommended` (and `.next` for Next), add an override block that suppresses `react-doctor/only-export-components` for Next App Router files that legitimately export `metadata`/`viewport`/`revalidate`:

- `app/**/layout.{tsx,jsx,ts,js}`
- `app/**/page.{tsx,jsx,ts,js}`
- (Astro has no equivalent; if the same warning fires in Astro scenarios it is a different shape — but Failure B only manifests for Next, per the CI logs.)

Two implementation shapes:

1. **Inline override in the rendered `eslint.config.mjs`.** Add a `globalIgnores`-style block, or a per-file override setting the rule to `off`. Self-contained, no upstream change required.
2. **Pin `react-doctor` 0.9.11 in `src/versions.json` until the scaffold is updated.** Reverts one renovate bump and adds a note. Faster but does not solve the underlying scaffold issue; the next bump will reintroduce Failure B.

Recommended: **B1** (inline override). It is the right product call: the scaffold's `app/**` exports are required by Next.js and the rule is wrong about them.

### C. Close the renovate changeset gap (Failure C)

Three options, each orthogonal:

1. **Configure renovate to add a changeset.** Update `renovate.json` to enable the `changesets`-related custom manager / `prBodyNotes` already documented in `scripts/changeset-rules.mjs` lines 1-8. This is the AGENTS.md-intended path.
2. **Manually push the local changeset commit.** `9be1f46 chore(changeset): record generated app pin updates` already exists locally and adds `.changeset/weekly-generated-pins.md`. Push it to the PR branch and the changeset-guard will pass.
3. **Land the renovate PR with a follow-up.** Treat the missing changeset as a one-off revert risk; document in the PR body. This is the worst option — it leaves the guard bypassed and reintroduces the same risk next renovate cycle.

Recommended: **C2** for immediate unblock, **C1** as a follow-up to keep renovate working at scale.

### D. Test coverage to lock in A and B

Once A and B land:

1. Add an executor-trace assertion in `tests/dry-run.test.ts` that verifies the new `npm install` step (A1) sits between `shadcn init` and the dev-dep install, gated on `pm: 'npm'`. The existing pattern `expect(output).not.toContain('run npm install --save-dev')` at line 134 is the template.
2. Add a snapshot test in `tests/templates.test.ts` (or a new `tests/eslint-config.test.ts`) that asserts the rendered Next `eslint.config.mjs` contains the `app/**` override for `react-doctor/only-export-components`.
3. Add a `tests/changeset-guard.test.ts` case for the renovate branch pattern (headRef `renovate/generated-app-pins-(non-major)`) — currently the guard treats renovate branches like any other, which is fine for behaviour but means the gap in Failure C is not caught at the policy layer.

## Recommendation

Land in this order, smallest blast radius first:

1. **C2** (push the local `9be1f46` changeset commit to PR #69) — closes the policy violation on PR #69 with zero source changes. Lets the changeset-guard pass.
2. **B1** (eslint override in `src/templates/eslint.ts`) — unblocks `npm-b1-no-tests`, `pnpm-b2-e2e`, `pnpm-b3-commitlint`, `bun-b5-minimal` on PR #69 and removes a regression risk for every `purrfold@latest` user. Add the snapshot test under `tests/templates.test.ts` (or new file).
3. **A1** (`npm install` between shadcn and `installQualityLayer` for npm only) — unblocks `npm-default-unit` and `astro-npm-ssg-unit` on PRs #69, #76, #77, #78 and every nightly run. Add the executor-trace assertion to `tests/dry-run.test.ts`.
4. **A3** (CI workflow only: pin npm 11.x in `.github/workflows/ci.yml` `Setup Node.js` step via post-setup `npm i -g npm@11`) — belt-and-braces for CI; A1 already protects downstream.
5. **C1** (configure renovate to auto-generate changesets) — long-term fix for Failure C.
6. **D3** (test case for renovate branch pattern in `tests/changeset-guard.test.ts`) — ensures the policy layer documents the gap if renovate config drifts.

This sequence keeps each step reviewable (under the 400-line budget per `sdd-phase-common.md` §E), decouples lint rules from install sequencing, and turns a "fix the bots" sprint into four independent PRs. Recommend splitting into chained PRs if `sdd-tasks` projects the apply step over 400 lines.

### Coverage / risk summary

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A1 regresses pnpm/bun | Low | Guard the new step behind `if (options.packageManager === 'npm')`; pnpm/bun path is unchanged. |
| B1 over-broadens eslint override and silences real bugs | Medium | Scope override to `app/**` paths only; document why in a comment in the rendered config so a future reviewer sees the rationale. |
| A1 introduces a duplicate `npm install` on cold caches and slows CI | Low | Use `--prefer-offline` or rely on the shared npm download cache (`scripts/e2e/harness.mjs:190`); CI cache already keeps `~/.npm` warm. |
| Renovate ignores the `changesets` custom manager config | Low | Document the renovate update in `AGENTS.md` and add a renovate-presence test if possible; otherwise lean on C2 manual until renovate is reconfigured. |
| Lockfile drift between versions.json pin and npm registry | Low | AGENTS.md already mandates the CLI E2E suite after pin bumps (`npm run test:e2e:cli`). |

## Risks

- **Open PR #69 cannot be merged until A and B land.** Its head is `e187329` and CI is red across three independent checks (changeset-guard, lint, scenarios).
- **Renovate will keep opening similar PRs** until C1 lands or the project pins renovate to the existing bot behavior. Treat C1 as required long-term.
- **The nightly issue cron will continue opening issues** until A1 (or A3) lands. The nightly-report job will keep writing "Nightly E2E failure …" issues at `cron: '23 5 * * *'`.
- **Failure A may also affect downstream users** who scaffold with the released `purrfold` on a system that ships npm 10.x. A1 closes that for npm users; A3 only affects CI.
- **Failure B will reach downstream users the moment a `purrfold@latest` containing the new `react-doctor` pin is released.** B1 is the only fix that protects users; pinning `react-doctor` back to 0.9.11 in `src/versions.json` (B2) is a stopgap.

## Ready for Proposal

Yes. The orchestrator can dispatch `sdd-propose` with the change name `stabilize-e2e-and-bot-prs`. The proposal should split into chained PRs sized to the 400-line budget:

- **PR 1 — `fix/ci-stabilize-shared-npm-install`**: A1 + A3 + their tests (estimated <200 LoC).
- **PR 2 — `fix/eslint-app-metadata-override`**: B1 + its snapshot test (estimated <80 LoC).
- **PR 3 — `chore/renovate-changeset-config`**: C1 (estimated <40 LoC in `renovate.json`).

C2 (push the local changeset) is a git-only action and can be done independently of the proposal pipeline. C3 (manual PR body note) is a fallback if C2 fails.

Phase recommendation: proceed to `sdd-propose`. No clarifications needed from the user — the failure modes are cited, the modules are named, and the file paths are concrete.
