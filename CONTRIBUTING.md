# Contributing to purrfold

Thanks for helping out. This document covers the contribution process; the
[README](README.md) covers local development in detail and `AGENTS.md` covers
the conventions that automated contributors must follow.

## Getting set up

Requires Node `>=22.13.0` (see [ADR-0001](docs/adr/0001-node-engine-floor.md)).

```bash
npm install
npm run check
```

`npm run check` runs typecheck, the Vitest suite, and the `tsup` build. It must
pass before any pull request is opened.

## Test tiers

Not every tier runs on every change. Pick the smallest one that covers what you
touched.

| Command | What it covers | When to run |
|---|---|---|
| `npm run check` | Typecheck, unit tests, build | Always |
| `npm run test:pack` | The packed npm tarball, installed and executed | After touching `files`, `bin`, `prepack`, or the build output |
| `npm run test:e2e:cli:quick` | Dry-run command generation | After changing CLI flags or command construction |
| `npm run test:e2e:cli` | Real Next.js and Astro generations across npm, pnpm, and bun | After changing installers, templates, or pinned versions |
| `npm run test:e2e:cli:heavy` | Network-bound interactive scenarios | On demand; needs a working `node-pty` |

The real-generation tiers are slow and network-bound. CI runs them for you on
any pull request that touches `src/`, `scripts/`, `package.json`,
`package-lock.json`, or `.github/workflows/e2e.yml`.

## Branches and commits

Branch names follow `type/description`, lowercase:

```
feat/astro-ssr-adapter
fix/husky-activation
ci/e2e-merge-gating
docs/community-surface
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(optional-scope): description
```

Valid types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`,
`revert`, `style`, `test`.

**Do not add `Co-Authored-By` trailers or any AI attribution to commit
messages.** Write the message so it describes the change, not the tooling used
to produce it.

## Changesets

Any change that a user of the published package could observe needs a changeset:

```bash
npm run changeset
```

That includes bumps to `src/versions.json`, because those versions land inside
generated apps.

It does **not** include CI configuration, repository docs, or tests — none of
those reach the published tarball (`files` is `dist`, `README.md`, `llms.txt`).

Do not hand-edit `CHANGELOG.md` or bump `version` manually; `npm run
changeset:version` owns both.

## Single sources of truth

Two files are authoritative, and duplicating their contents elsewhere is the
most common way this repository drifts:

- **`src/cli-metadata.ts`** — every CLI option and scenario. `--help`,
  `info --json`, `llms.txt`, the README table, and `skills/purrfold/SKILL.md`
  all mirror it.
- **`src/versions.json`** — every dependency version pinned into generated apps.
  Never hardcode a generated-app version anywhere else.

## Pull requests

Fill in the pull request template. Keep the change reviewable: one concern per
pull request, with its tests and documentation alongside the behavior they
describe.

These checks are required on `main` and must pass before merge:

- `check`
- `pack-smoke (ubuntu-latest)` and `pack-smoke (windows-latest)`
- `e2e-quick (ubuntu-latest)` and `e2e-quick (windows-latest)`
- `e2e-ok`

`e2e-ok` is a summary check. The real-generation jobs are named dynamically by
the scenario matrix, so they cannot be required individually; `e2e-ok` passes
when they succeed or are legitimately skipped, and fails when any of them fails
or is cancelled.

## README badges

Only add a badge whose claim links to its own evidence — CI status, npm version,
provenance. Do not add a badge for a program the project is not enrolled in, or
one whose claim a reader cannot check by following the link. A badge that
overstates is worse than no badge.

## Reporting problems

Use the [issue forms](https://github.com/C3SC0-V4113/Scaffold/issues/new/choose).
For anything security-related, follow [SECURITY.md](SECURITY.md) instead of
opening a public issue.
