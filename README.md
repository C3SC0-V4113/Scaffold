# purrfold 🐱

`purrfold` creates a new latest Next.js app and applies a production-oriented quality baseline: shadcn setup, strict ESLint, Prettier, Husky, React Doctor, React Scan, agent docs, Claude compatibility, and optional testing/commit tooling.

```bash
npx purrfold@latest my-app
```

V1 only supports new projects created with `create-next-app@latest`. It does not retrofit existing apps or support non-Next frameworks.

## What It Generates

- Next.js App Router project with TypeScript, Tailwind, ESLint, and `@/*` alias.
- shadcn initialized through the official `shadcn init` flow.
- Quality scripts for linting, formatting, typechecking, React Doctor, React Scan, and final checks.
- Optional Vitest + React Testing Library.
- Optional Playwright E2E testing.
- Optional commitlint + Husky commit-msg hook.
- Generic `README.md`, `DESIGN.md`, `AGENTS.md`, `CLAUDE.md`, `.agents/skills`, and Claude hooks in generated apps.

## Usage

```bash
purrfold <target-dir> [options]
```

Options:

- `--pm npm|pnpm|bun`: choose the package manager.
- `--unit` / `--no-unit`: include or skip Vitest + React Testing Library.
- `--e2e` / `--no-e2e`: include or skip Playwright.
- `--commitlint` / `--no-commitlint`: include or skip commitlint.
- `--yes`: use non-interactive defaults.
- `--dry-run`: print operations without writing files or installing packages.
- `--skip-install`: generate quality files without installing additional quality dependencies.
- `--shadcn-args <args...>`: forward extra arguments to `shadcn init`.

Dry-run examples:

```bash
npm run dev -- my-app --pm npm --unit --e2e --commitlint --dry-run
npm run dev -- my-app --pm pnpm --no-unit --e2e --no-commitlint --dry-run
npm run dev -- my-app --pm bun --unit --no-e2e --commitlint --dry-run
```

## For AI agents

purrfold is designed to be driven by coding agents (Claude Code, Codex, opencode).
An agent can discover the full option schema at runtime:

```bash
npx purrfold@latest info --json
```

Machine-readable guidance also lives in [`llms.txt`](./llms.txt), and a Claude
Code skill is available in [`skills/purrfold/SKILL.md`](./skills/purrfold/SKILL.md).

Map a user's intent to the right command:

| The user wants… | Run |
| --- | --- |
| Defaults (unit tests, no e2e/commitlint) | `npx purrfold@latest my-app --yes` |
| No testing at all | `npx purrfold@latest my-app --no-unit --no-e2e --yes` |
| Full setup (unit + e2e + commitlint) | `npx purrfold@latest my-app --unit --e2e --commitlint --yes` |
| A specific package manager | `npx purrfold@latest my-app --pm pnpm --yes` |
| Preview without writing | `npx purrfold@latest my-app --yes --dry-run` |

Always pass `--yes` when running non-interactively so purrfold does not block on prompts.

### Install the Claude Code skill

```bash
npx skills@latest add github:C3SC0-V4113/Scaffold --skill purrfold --copy --yes
```

Or copy `skills/purrfold/SKILL.md` into your `.claude/skills/` (project) or
`~/.claude/skills/` (global) directory.

## Local Development

```bash
npm install
npm run check
```

`npm run check` runs typecheck, tests, and the `tsup` build.

## Local Smoke Test

Create a local package and run it with `npx`:

```bash
npm pack
mkdir ..\cli-smoke-tests
cd ..\cli-smoke-tests
npx ..\scaffold-next-quality\purrfold-0.1.0.tgz my-app --yes --unit --e2e --commitlint
```

Then validate the generated app:

```bash
cd my-app
npm run check
```

## Releases

Versioning and the changelog are managed with [Changesets](https://github.com/changesets/changesets).

1. After a change, describe it and pick the bump type:

   ```bash
   npm run changeset
   ```

2. When ready to release, apply pending changesets (bumps the version and writes
   `CHANGELOG.md`) and commit:

   ```bash
   npm run changeset:version
   git commit -am "release: version packages"
   ```

3. Publish to npm (runs `npm run check` first and tags the release):

   ```bash
   npm run release
   ```

The package is built with `tsup` into a single `dist/index.js`.

## Agent Setup

Project agent guidance lives in `AGENTS.md`. Claude Code loads `CLAUDE.md`, which points to `AGENTS.md`. Skills live in `.agents/skills`; `.claude/skills` is only a compatibility bridge.
