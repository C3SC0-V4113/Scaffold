# purrfold

## 0.2.3

### Patch Changes

- Fix generated `vitest.config.mts` import ordering so generated apps pass ESLint `import/order` during `npm run check`.

## 0.2.2

### Patch Changes

- Pin the generated Vitest stack to a Next.js-guide-compatible Vite 7 setup (`@vitejs/plugin-react` 5, `vite`, and `vite-tsconfig-paths`) and run optional shadcn MCP setup after quality dependencies so npm avoids the Babel peer-resolution conflict seen with plugin-react 6 and shadcn presets.

## 0.2.1

### Patch Changes

- c7e9850: Add a dedicated CLI E2E harness with shared smoke scenarios, quick dry-run coverage, real npm/pnpm/bun app checks, and TTY-gated interactive scenario definitions.
- 57ea1c6: Add `--icons <lucide|phosphor|tabler>` for the generated home-page cat icon.

  purrfold now detects the icon library configured by shadcn, keeps it when
  supported, otherwise normalizes to lucide. It also ensures exactly the selected
  icon package is installed so the generated app does not keep unused icon
  dependencies.

- 57ea1c6: Add optional shadcn MCP setup and document shadcn preset compatibility.

  - Add `--mcp / --no-mcp`; `--yes` keeps MCP disabled unless `--mcp` is explicit.
  - When enabled, purrfold initializes shadcn MCP for Claude, Codex, and OpenCode
    using the selected package manager.
  - Document Codex TOML guidance and official shadcn preset forwarding through
    `--shadcn-args --preset <id>`.
  - Expand the release smoke matrix to cover package managers, shadcn presets,
    testing, and commitlint combinations.

- 57ea1c6: Fix generated apps that failed their own `check`.

  - Stop re-registering the `import` ESLint plugin because `eslint-config-next`
    already provides it, avoiding `Cannot redefine plugin "import"` under pnpm.
  - Ignore vendored `components/ui/**` shadcn primitives in ESLint so radix/cva
    imports no longer fail `import/order`; the files remain type-checked and
    formatted.
  - Merge React Doctor's pnpm hardening settings into `pnpm-workspace.yaml`
    without dropping existing keys.

- 6d2e581: Pin the dev dependencies purrfold installs into generated apps to known-good
  versions (`DEPENDENCY_VERSIONS` in `src/installers/config-model.ts`). Previously
  the tooling was installed by bare name, so `bun add` resolved to the absolute
  latest and escaped create-next-app's existing ranges — pulling in ESLint 10,
  which removed `context.getFilename()` and crashed `eslint-plugin-react`, so
  `eslint .` failed only under bun. Installs now use explicit `name@version`
  specifiers, keeping npm, pnpm, and bun on the same versions. ESLint stays on v9
  until `eslint-plugin-react` supports v10. create-next-app and shadcn remain on
  `@latest` by design.

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
