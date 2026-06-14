---
name: purrfold
description: Scaffold a new production-ready frontend app (Next.js + shadcn + strict quality tooling) using the purrfold CLI. Use when the user wants to create/bootstrap/scaffold a new web app or project, or asks to "install/run purrfold" with or without testing, e2e, commitlint, or a specific package manager.
---

# purrfold — scaffold a frontend app

`purrfold` is a CLI that creates a new app from `create-next-app@latest` and
applies a production-oriented quality baseline: shadcn, strict ESLint, Prettier,
Husky, React Doctor, React Scan, agent docs, Claude hooks, and optional unit
(Vitest), e2e (Playwright), and commitlint. The generated app self-tests and is
green out-of-the-box.

No install step is required — run it with `npx`. Always pass `--yes` so it runs
non-interactively.

## How to run

```bash
npx purrfold@latest <target-dir> [options]
```

`<target-dir>` is required and becomes the project folder name.

## Options

- `--pm <npm|pnpm|bun>` — package manager (default: npm with `--yes`).
- `--unit` / `--no-unit` — Vitest + React Testing Library (default: included).
- `--e2e` / `--no-e2e` — Playwright e2e (default: skipped).
- `--commitlint` / `--no-commitlint` — commitlint + commit-msg hook (default: skipped).
- `--yes` — non-interactive defaults (no prompts). **Always include this when running for the user.**
- `--dry-run` — print operations without writing or installing.
- `--skip-install` — generate files without installing extra quality deps.
- `--shadcn-args <args...>` — extra args forwarded to `shadcn init`, including `--preset <id>`.
- `--mcp` / `--no-mcp` — optionally install shadcn MCP for Claude, Codex, and OpenCode (default: skipped).
- `--icons <lucide|phosphor|tabler>` — icon library for the home-page cat (default: shadcn's choice, else lucide).

To fetch the canonical option schema at runtime: `npx purrfold@latest info --json`.

## Map the user's intent to a command

| The user says… | Run |
| --- | --- |
| "scaffold/create a new app" (defaults) | `npx purrfold@latest <dir> --yes` |
| "without testing" / "no tests" | `npx purrfold@latest <dir> --no-unit --no-e2e --yes` |
| "with e2e" / "add Playwright" | `npx purrfold@latest <dir> --e2e --yes` |
| "the full setup" / "everything" | `npx purrfold@latest <dir> --unit --e2e --commitlint --yes` |
| "use pnpm/bun" | `npx purrfold@latest <dir> --pm pnpm --yes` |
| "use phosphor/tabler icons" | `npx purrfold@latest <dir> --icons phosphor --yes` |
| "install shadcn MCP" | `npx purrfold@latest <dir> --mcp --yes` |
| "use a shadcn preset" | `npx purrfold@latest <dir> --shadcn-args --preset b3REw8vwo --yes` |
| "just show me what it would do" | `npx purrfold@latest <dir> --yes --dry-run` |

## Notes

- Replace `<dir>` with the project name the user gives you.
- Generation runs installs and a full quality check, so it can take a few
  minutes; if it fails, the scaffold was not green — surface the error.
- The default command is `create`; `purrfold my-app` and `purrfold create my-app`
  are equivalent.
- Maintainers can validate dry-run CLI coverage with `npm run test:e2e:cli:quick`.
  The full real-app CLI matrix is `npm run test:e2e:cli -- --work-dir E:\Repositorios\smoke --keep`
  and is intentionally outside `npm run check`.
