<!--
Keep this reviewable: one concern per pull request, with its tests and docs
alongside the behavior they describe.
-->

## What this changes

<!-- One or two sentences. What is different after this merges? -->

## Why

<!-- The problem being solved. If it fixes an issue, link it: Closes #N -->

## Changes

| File | Change |
|------|--------|
|      |        |

## Test plan

<!--
State what you actually ran, not what you intended to. If a tier does not apply,
delete the line rather than leaving it unchecked without explanation.
-->

- [ ] `npm run check`
- [ ] `npm run test:pack` — touched `files`, `bin`, `prepack`, or the build output
- [ ] `npm run test:e2e:cli:quick` — touched CLI flags or command construction
- [ ] `npm run test:e2e:cli` — touched installers, templates, or pinned versions

## Checklist

- [ ] Added a changeset, or this change does not reach the published tarball
      (CI config, repo docs, and tests do not)
- [ ] Conventional Commit messages, with no `Co-Authored-By` or AI attribution
- [ ] Updated `src/cli-metadata.ts` if a CLI flag changed, and the docs that mirror it
- [ ] Updated `src/versions.json` only, if a generated-app version changed
