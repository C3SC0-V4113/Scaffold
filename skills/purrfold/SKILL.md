---
name: purrfold
description: Scaffold a new production-ready frontend app (Next.js, Astro, Vite, or React Router framework mode + shadcn + strict quality tooling, including @shadcn/lint design system rules) using the purrfold CLI. Use when the user wants to create/bootstrap/scaffold a new web app or project, or asks to "install/run purrfold" with or without testing, e2e, commitlint, or a specific package manager.
---

# purrfold — scaffold a frontend app

`purrfold` is a CLI that creates a new app from `create-next-app@latest`,
`create-astro@latest`, `create-vite@latest`, or `create-react-router@latest` and applies a production-oriented quality baseline: shadcn,
strict ESLint with `@shadcn/lint` design system rules, Prettier, Husky, React Doctor, React Scan, agent docs, Claude
hooks, and optional unit (Vitest), e2e (Playwright), commitlint, and GitHub
Actions CI. The
generated app self-tests and is green out-of-the-box.

No install step is required — run it with `npx`. Always pass `--yes` so it runs
non-interactively.

## How to run

```bash
npx purrfold@latest <target-dir> [options]
```

`<target-dir>` is required and becomes the project folder name.

## Options

- `--pm <npm|pnpm|bun>` — package manager (default: npm with `--yes`).
- `--framework <next|astro|vite|react-router>` — framework to scaffold (default: Next.js).
- `--router <none|react-router-data|react-router-declarative>` — Vite router mode (default: React Router data mode); Next.js, Astro, and React Router framework mode accept only `none`.
- `--ssr` / `--no-ssr` — choose SSR for Astro or React Router framework mode; React Router defaults to SSR and prerenders `/` when disabled.
- `--adapter <node|vercel|netlify|cloudflare>` — Astro SSR adapter (default: cloudflare when SSR is enabled).
- `--unit` / `--no-unit` — Vitest + React Testing Library (default: included).
- `--e2e` / `--no-e2e` — Playwright e2e (default: skipped).
- `--commitlint` / `--no-commitlint` — commitlint + commit-msg hook (default: skipped).
- `--ci` / `--no-ci` — GitHub Actions workflows: `quality.yml`, plus `playwright.yml` with `--e2e` (default: skipped).
- `--motion` — install Motion for React and the `motion-framer` skill (default: skipped; opt-in only).
- `--query` — install TanStack Query, development-only React Query Devtools, and the `tanstack-query` skill (default: skipped; opt-in only).
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
| "use Astro" / "scaffold Astro" | `npx purrfold@latest <dir> --framework astro --yes` |
| "use Vite" / "scaffold Vite" | `npx purrfold@latest <dir> --framework vite --yes` |
| "use React Router framework mode" | `npx purrfold@latest <dir> --framework react-router --yes` |
| "Vite with React Router declarative mode" | `npx purrfold@latest <dir> --framework vite --router react-router-declarative --yes` |
| "Vite without a router" | `npx purrfold@latest <dir> --framework vite --router none --yes` |
| "use Astro SSR" / "scaffold Astro SSR" | `npx purrfold@latest <dir> --framework astro --ssr --adapter cloudflare --yes` |
| "without testing" / "no tests" | `npx purrfold@latest <dir> --no-unit --no-e2e --yes` |
| "with e2e" / "add Playwright" | `npx purrfold@latest <dir> --e2e --yes` |
| "the full setup" / "everything" | `npx purrfold@latest <dir> --unit --e2e --commitlint --ci --yes` |
| "with CI" / "add GitHub Actions" | `npx purrfold@latest <dir> --ci --yes` |
| "use pnpm/bun" | `npx purrfold@latest <dir> --pm pnpm --yes` |
| "install Motion" / "use Motion for React" | `npx purrfold@latest <dir> --motion --yes` |
| "add server state caching" / "use TanStack Query" | `npx purrfold@latest <dir> --query --yes` |
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
