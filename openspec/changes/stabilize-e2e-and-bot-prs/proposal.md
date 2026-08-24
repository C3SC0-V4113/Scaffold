# Proposal: Stabilize E2E and Bot PRs

## Intent

Remove independent failures that make the real E2E gate unreliable, block dependency PRs, and cause nightly incident issues despite a healthy scaffold expectation.

## Scope

### In Scope
- Route npm-owned package additions after `shadcn init` through legacy peer dependency resolution, protecting npm 10 E2E runs and generated consumer projects.
- Preserve strict linting while exempting legitimate Next App Router metadata exports from `react-doctor/only-export-components` in the generated ESLint template.
- Add focused regression coverage and validate that nightly E2E becomes green, so its issue signal again represents a real failure.
- Validate fixes independently, then refresh affected bot PRs only after the remediation branches pass; keep review slices below 400 changed lines where practical.

### Out of Scope
- Renovate changeset-policy automation or pushing PR #69's changeset; defer until its non-policy pipelines pass.
- Reverting or downgrading `react-doctor`, weakening `--max-warnings 0`, deleting lockfiles, or changing pnpm/bun behavior.
- Re-running workflows, modifying GitHub state, rebasing, merging, or changing unrelated CI policy in this change.

## Capabilities

### New Capabilities
- `scaffold-installation`: npm scaffolds bypass the npm 10 peer-dependency resolver when purrfold adds dependencies after initialization.
- `next-app-router-linting`: generated Next App Router lint configuration accepts required metadata exports while retaining strict linting.

### Modified Capabilities
None — no baseline OpenSpec capabilities exist.

## Approach

Pass `--legacy-peer-deps` to npm package-addition commands after shadcn initialization; remove the ineffective plain-install normalization step and leave pnpm and bun untouched. Render a narrowly scoped ESLint override for `app/**/{layout,page}` files. Lock both behaviors with dry-run command-order and rendered-template assertions.

Validation/refresh order: validate each focused slice locally, run the relevant real CLI E2E scenarios, then `npm run check`; refresh bot PRs #76–#78 and #69 only after those fixes pass. Confirm the next scheduled E2E run is green and produces no false nightly failure issue. Consider the deferred Renovate changeset policy only after #69's other pipelines pass.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/commands/create.ts` | Modified | Remove ineffective npm install normalization |
| `src/package-manager.ts` | Modified | npm package-addition command flags |
| `src/templates/eslint.ts` | Modified | Next App Router rule override |
| `tests/dry-run.test.ts` | Modified | npm command-order regression test |
| `tests/templates.test.ts` | Modified | generated ESLint configuration coverage |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| npm fix affects peer resolution | Low | Guard strictly on npm; assert unchanged pnpm and bun paths |
| Override hides valid lint findings | Medium | Limit to Next App Router layout/page paths |
| Nightly remains red from an independent cause | Medium | Validate scenarios before interpreting issue signal |

## Rollback Plan

Revert the isolated npm sequencing and ESLint-template slices independently; preserve strict linting and restore the prior generated config if a targeted override proves unsafe.

## Dependencies

- Current `shadcn` behavior and npm 10 lockfile reification remain the reproduction conditions.

## Success Criteria

- [ ] npm E2E and generated consumer installation complete after shadcn initialization with legacy peer dependency resolution.
- [ ] Generated Next projects lint cleanly with required metadata exports and zero warnings allowed.
- [ ] Regression tests and `npm run check` pass; the subsequent nightly E2E signal is green.
