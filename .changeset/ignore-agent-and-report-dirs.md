---
"purrfold": patch
---

Keep agent tooling state and test reports out of lint, format, React Doctor, and `astro check` in generated apps.

Each tool reads its own ignore file, and none of them follows git's full rules. Prettier 3 reads only the root `.gitignore` and `.prettierignore`, so it walked Claude Code worktrees, the `.codegraph` index, and `.atl` scratch files and failed `format:check`. React Doctor scanned the minified trace viewer inside `playwright-report`, and `astro check`, whose tsconfig includes `**/*`, type-checked the same report. ESLint flagged the wrangler-generated `worker-configuration.d.ts` in Astro apps on the Cloudflare adapter.

Generated apps now list these paths in `.gitignore`, `.prettierignore`, the ESLint global ignores, `doctor.config.json`, and the Astro tsconfig `exclude`, from one shared list. `.gitignore` also covers the per-developer `.claude/settings.local.json`, and `.prettierignore` covers `CLAUDE.md`, which Windows checks out as a text file without a trailing newline when it is a symlink.
