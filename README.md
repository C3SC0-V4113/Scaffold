# scaffold-next-quality

Create a Next.js app with shadcn, strict quality tooling, agent docs, Claude hooks, and optional testing.

```bash
npx scaffold-next-quality@latest my-app
```

The CLI creates a Next.js app with `create-next-app@latest`, delegates shadcn setup to `shadcn init`, then applies linting, formatting, React Doctor, React Scan, Husky, skills, docs, and optional test tooling.

## Development

```bash
npm install
npm run check
```

## Options

```bash
scaffold-next-quality <target-dir> [options]
```

- `--pm npm|pnpm|bun`: choose the package manager.
- `--unit` / `--no-unit`: include or skip Vitest + React Testing Library.
- `--e2e` / `--no-e2e`: include or skip Playwright.
- `--commitlint` / `--no-commitlint`: include or skip commitlint.
- `--yes`: use non-interactive defaults.
- `--dry-run`: print operations without writing files or installing packages.
- `--skip-install`: generate quality files without installing additional quality dependencies.
- `--shadcn-args <args...>`: forward extra arguments to `shadcn init`.

V1 only creates new latest Next.js apps through `create-next-app@latest`; it does not retrofit existing projects.

Dry-run examples:

```bash
npm run dev -- my-app --pm npm --unit --e2e --commitlint --dry-run
npm run dev -- my-app --pm pnpm --no-unit --e2e --no-commitlint --dry-run
npm run dev -- my-app --pm bun --unit --no-e2e --commitlint --dry-run
```
