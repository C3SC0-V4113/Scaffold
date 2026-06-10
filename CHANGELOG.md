# purrfold

## 0.2.0

### Minor Changes

- Ship a green-out-of-the-box scaffold and make purrfold agent-friendly.

  - Generated apps now pass their own quality gate with no manual fixes: clean
    `app/layout.tsx` / `app/page.tsx` templates (react-scan via `next/script`,
    neutral metadata, lucide usage, a real `<h1>`), a shadcn-aware ESLint override,
    ordered config imports, `doctor.config.json`, a single-line `.prettierignore`,
    a relative `.claude/skills` link, and a `.gitattributes`.
  - The generator self-tests: it runs `prettier --write` and the project's own
    `check` after generation and fails if the scaffold is not green.
  - React Doctor scripts use the non-deprecated `--blocking` flag and run
    non-interactively (`--yes`).
  - New `info` command with `--json` for machine-readable option discovery,
    `--version`, `--help` examples, an `llms.txt`, and a Claude Code skill so
    agents can scaffold with the right flags (e.g. "without testing").
  - Tooling: build with `tsup`, releases managed with Changesets.
