# purrfold 🐱

`purrfold` creates a new latest Next.js or Astro app and applies a production-oriented quality baseline: shadcn setup, strict ESLint, Prettier, Husky, React Doctor, React Scan, agent docs, Claude compatibility, and optional testing/commit tooling.

```bash
npx purrfold@latest my-app
```

V1 supports new projects created with `create-next-app@latest` or `create-astro@latest`. It does not retrofit existing apps.

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
- `--framework next|astro`: choose the framework. Defaults to Next.js.
- `--unit` / `--no-unit`: include or skip Vitest + React Testing Library.
- `--e2e` / `--no-e2e`: include or skip Playwright.
- `--commitlint` / `--no-commitlint`: include or skip commitlint.
- `--yes`: use non-interactive defaults.
- `--dry-run`: print operations without writing files or installing packages.
- `--skip-install`: generate quality files without installing additional quality dependencies.
- `--shadcn-args <args...>`: forward extra arguments to `shadcn init`, including `--preset <id>`.
- `--mcp` / `--no-mcp`: optionally install shadcn MCP for Claude, Codex, and OpenCode. Defaults to off.
- `--icons <lucide|phosphor|tabler>`: icon library for the home-page cat. Defaults to shadcn's choice (or lucide). If shadcn is configured with an unsupported icon library, purrfold normalizes it to lucide.

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
| Scaffold Astro instead of Next.js | `npx purrfold@latest my-app --framework astro --yes` |
| No testing at all | `npx purrfold@latest my-app --no-unit --no-e2e --yes` |
| Full setup (unit + e2e + commitlint) | `npx purrfold@latest my-app --unit --e2e --commitlint --yes` |
| A specific package manager | `npx purrfold@latest my-app --pm pnpm --yes` |
| A specific icon library for the cat | `npx purrfold@latest my-app --icons phosphor --yes` |
| shadcn MCP for Claude/Codex/OpenCode | `npx purrfold@latest my-app --mcp --yes` |
| A shadcn preset | `npx purrfold@latest my-app --shadcn-args --preset b3REw8vwo --yes` |
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

### CLI E2E tests

Heavy CLI E2E tests live outside `npm run check` so the normal gate stays fast
and deterministic.

```bash
npm run test:e2e:cli:quick
npm run test:e2e:cli -- --work-dir E:\Repositorios\smoke --keep
npm run test:e2e:cli:heavy
```

The quick suite builds the local CLI and verifies dry-run command generation,
including shadcn MCP commands and preset forwarding. The default suite
(`test:e2e:cli`) generates real apps for npm, pnpm, and bun, checks generated
files, and runs each generated app's package-manager `run check`.

Extra-heavy scenarios (`heavy: true`) are excluded from the default suite
because they are network-bound, slow, and timing-fragile. Run them on demand
with `npm run test:e2e:cli:heavy`, or target one with
`npm run test:e2e:cli -- --scenario external-shadcn-interactive`. Today this
covers `external-shadcn-interactive`, a full no-`--yes` generation that drives
create-next-app and the external shadcn CLI through their own interactive
prompts.

TTY-driven prompt coverage runs through a `node-pty` adapter. `node-pty` is a
dev dependency and ships a native addon, so it must compile on the host (Windows
needs the standard Node build toolchain). When it is installed, the TTY
scenarios run; when it is missing they skip gracefully and never affect
`npm run check`. Pass `--require-tty` to turn a missing-`node-pty` skip into a
hard failure (the `heavy` command sets it, since these scenarios require a PTY).
On a timeout the adapter force-kills the PTY child's process tree
(`taskkill /T /F` on Windows) so a stuck interactive run fails the scenario
instead of wedging the whole suite.

### Smoke matrix

`npm run smoke` builds the CLI and generates real apps across package managers,
shadcn presets, testing, and commitlint combinations; each generated app
uses the same scenario definitions as the CLI E2E suite and self-tests via its
own `check`. It is heavy and network-bound, so run it
manually before a release:

```bash
npm run smoke
npm run smoke -- --work-dir E:\Repositorios\smoke --keep
```

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
