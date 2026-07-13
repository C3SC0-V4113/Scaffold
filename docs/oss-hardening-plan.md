# OSS Hardening Plan — purrfold

Status: REVIEWED
Date: 2026-07-12
Scope: merge gating, package verification, trusted publishing, multi-OS coverage, and contributor guidance

## Outcome

Harden the path from pull request to npm without changing CLI behavior. Work proceeds in six reviewable phases: merge gating, packed-artifact smoke testing, trusted npm publishing, multi-OS generation coverage, community documentation, then removal of this temporary plan.

## Existing baseline

- `npm run check` runs typechecking, tests, and the build.
- `.github/workflows/ci.yml` runs the quality gate and quick dry-run E2E checks on Ubuntu and Windows.
- `.github/workflows/e2e.yml` generates its scenario matrix from `scripts/cli-e2e.mjs --list`; workflow files must not hardcode scenario names.
- `src/versions.json` is the single source of truth for generated-app dependency versions.
- Releases use Changesets, but publishing is currently manual.
- Conventional Commits are required; commit messages must not contain AI attribution.

## Goals

1. A failed required check makes a pull request unmergeable.
2. The exact npm tarball is tested before publication.
3. Releases use npm trusted publishing with provenance and no long-lived npm token.
4. Representative real-generation scenarios run on Ubuntu, Windows, and macOS.
5. Contributors receive durable, human-facing project guidance.

## Non-goals

- Changing CLI behavior, generated project content, or dependency pin policy.
- Replacing Changesets, Vitest, or the Dependabot/Renovate ownership split.
- Claiming OpenSSF compliance or adding an OpenSSF badge without verified enrollment and supporting evidence.

---

## Phase 1 — Merge gating

**Problem.** Dynamic E2E matrix jobs cannot be required reliably by name, and a path-filtered required workflow may never report on docs-only pull requests.

**Changes.**

- Run the E2E workflow for every pull request.
- Add a `changes` job that detects whether E2E-relevant paths changed.
- Skip scenario work when it is irrelevant, but always run a fixed-name `e2e-ok` summary job.
- Make `e2e-ok` fail when any required dependency fails or is cancelled and succeed when scenario jobs pass or are intentionally skipped. Scheduled/dispatch-only jobs such as `heavy` may be skipped without failing the summary.
- Configure the `main` branch ruleset to require pull requests and the stable checks: `check`, both `e2e-quick` jobs, and `e2e-ok`.

**Rules clarification.** Branch protection applies to changes merged into `main`. Tag creation is governed separately by tag rulesets. Do not grant a broad branch-protection bypass merely to permit release tags; add a narrowly scoped tag-rule allowance only if the release workflow is blocked from creating version tags.

**Acceptance.** A failed scenario makes its pull request unmergeable, while a docs-only pull request receives a successful `e2e-ok` without running the real-generation matrix.

## Phase 2 — Packed-tarball smoke test

**Problem.** Current tests execute the local bundle, not the artifact users install. Missing package files or a broken bin mapping can therefore ship unnoticed.

**Changes.**

- Add `scripts/pack-smoke.mjs` to run `npm pack`, inspect the tarball, install it into a temporary project, and execute the installed CLI.
- Assert that the package contains at least `dist/index.js`, `README.md`, `llms.txt`, and `package.json`.
- Verify `purrfold --version`, parse `purrfold info --json`, and run one dry-run generation.
- Add `npm run test:pack` and a CI `pack-smoke` job.

**Release requirement.** The trusted release workflow added in Phase 3 must run `npm run test:pack` in the publish job before `changeset publish`. A green earlier workflow on `main` is not sufficient evidence for the release job.

**Acceptance.** Removing a required packed file or breaking the executable path fails CI and blocks publication.

## Phase 3 — Trusted npm release

**Problem.** Publishing from a maintainer machine uses human credentials and does not provide a reproducible provenance trail.

**Changes.**

- Add `.github/workflows/release.yml`, triggered by pushes to `main`, using `changesets/action@v1`.
- With pending changesets, open or update the Changesets version pull request. After that pull request merges, publish and create the release tag.
- Use Node `>=22.14.0` and npm `>=11.5.1`; install an eligible npm version explicitly rather than relying on the runner image.
- Grant only `contents: write`, `pull-requests: write`, and `id-token: write`.
- Enable npm provenance through `publishConfig` and configure npm Trusted Publisher for repository `C3SC0-V4113/Scaffold` and workflow `release.yml`. Do not add `NPM_TOKEN` to the normal path.
- Run `npm run test:pack` in the publish job immediately before `npm run release`/`changeset publish`.
- Update durable release guidance in `AGENTS.md`; retain local publication only as a documented emergency procedure.

**Repository configuration.** A workflow using `GITHUB_TOKEN` to create the Changesets version pull request may require repository Actions settings to allow GitHub Actions to create and approve pull requests. Enable only the capability required to open/update that PR; human review and branch rules still apply.

**Rules clarification.** The version pull request is subject to the `main` branch rules from Phase 1. Release tags are subject to separate tag rules. If tag protection blocks the workflow, permit only the release workflow or expected version-tag pattern rather than bypassing `main` protection.

**Acceptance.** Merging a version pull request publishes a pack-smoke-verified package with npm provenance, creates the release tag, and uses no maintainer npm credential.

## Phase 4 — Multi-OS real generation

**Problem.** Real-generation E2E coverage is Ubuntu-only, although scaffolding failures can be operating-system-specific.

**Changes.**

- Mark two representative scenarios as cross-platform: one Next.js scenario and one Astro scenario.
- Generate Ubuntu entries for every scenario and additional Windows/macOS entries only for cross-platform scenarios.
- Set `runs-on` from the generated matrix and verify the persistent cache path on all three runner families.
- Keep network-heavy interactive scenarios Ubuntu-only.

**Acceptance.** The representative Next.js and Astro scenarios pass on Ubuntu, Windows, and macOS, and an OS-specific regression fails `e2e-ok`.

## Phase 5 — Community surface

**Changes.**

- Add `CONTRIBUTING.md` with setup, quality gates, E2E tiers, Changesets, and Conventional Commit guidance.
- Add `SECURITY.md` with private reporting through GitHub Security Advisories and a supported-versions policy.
- Add structured bug and feature issue forms plus a pull request template.
- Add only verifiable README badges, such as CI status and npm version/provenance. Do not add or imply an OpenSSF badge until the project is enrolled and the claim is independently supported.

**Acceptance.** Contributor instructions are durable, issue reports capture command/OS/package-manager/framework details, and every badge links to evidence for its claim.

## Phase 6 — Plan cleanup

**Problem.** This document is a temporary execution plan, not a permanent source of truth.

**Changes.**

- Confirm completed workflow behavior is documented in `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, or comments adjacent to the relevant workflow logic.
- Delete `docs/oss-hardening-plan.md` in the final phase; do not leave a stale completed plan for maintainers to reconcile later.

**Acceptance.** Durable guidance covers every retained operational decision, links remain valid, and this file no longer exists.

---

## Delivery order and branch strategy

Complete the phases strictly in this order:

`merge gating → pack smoke → trusted npm release → multi-OS coverage → community surface → plan cleanup`

Use one dedicated branch and one pull request per phase. Each pull request must be independently reviewable, keep its tests and documentation with the behavior they verify, and pass the repository quality gate before merge. Later branches start from the merged result of the previous phase; do not combine unfinished phases in one pull request.

| Phase | Provisional Conventional Commit message |
|---|---|
| 1 | `ci: enforce merge gating with an E2E summary check` |
| 2 | `test: verify the packed npm artifact` |
| 3 | `ci: publish releases through npm trusted publishing` |
| 4 | `test: add multi-OS generation coverage` |
| 5 | `docs: add community contribution and security guidance` |
| 6 | `docs: remove the completed OSS hardening plan` |

These messages are planning aids, not pre-approved commit text. Finalize each Conventional Commit message from the actual diff so it describes the delivered work unit accurately.

## Final verification

- Run `cmd /c npm run check` for every implementation pull request.
- Run the relevant workflow or local targeted test for each phase.
- Before Phase 6, verify that no unique operational guidance exists only in this plan.
