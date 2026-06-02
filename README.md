# scaffold-next-quality

`scaffold-next-quality` creates a new latest Next.js app and applies a production-oriented quality baseline: shadcn setup, strict ESLint, Prettier, Husky, React Doctor, React Scan, agent docs, Claude compatibility, and optional testing/commit tooling.

```bash
npx scaffold-next-quality@latest my-app
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
scaffold-next-quality <target-dir> [options]
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

## Local Development

```bash
npm install
npm run check
```

`npm run check` runs typecheck, tests, and build.

## Local Smoke Test

Create a local package and run it with `npx`:

```bash
npm pack
mkdir ..\cli-smoke-tests
cd ..\cli-smoke-tests
npx ..\scaffold-next-quality\scaffold-next-quality-0.1.0.tgz my-app --yes --unit --e2e --commitlint
```

Then validate the generated app:

```bash
cd my-app
npm run check
```

## Agent Setup

Project agent guidance lives in `AGENTS.md`. Claude Code loads `CLAUDE.md`, which points to `AGENTS.md`. Skills live in `.agents/skills`; `.claude/skills` is only a compatibility bridge.
