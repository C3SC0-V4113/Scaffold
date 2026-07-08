# Exploration: Multi-framework CLI, Astro first

**Change**: `multi-framework-astro`
**Phase**: explore
**Date**: 2026-07-07
**Precondition**: Node engine floor already raised to `>=22.13.0` (ADR-0001).

## Current State

`purrfold` is a single-purpose Next.js scaffolder. The CLI is a thin
Commander program that delegates to a single `runCreate` pipeline
(`src/commands/create.ts:123-150`) which always runs:

1. `createNextApp` (`src/installer/next.ts:28-36`) — shells out to
   `npx create-next-app@latest`.
2. `initializeShadcn` (`src/installer/shadcn.ts`).
3. `installQualityLayer` (`src/installer/quality.ts:161-215`) — writes
   ESLint, Prettier, Husky, GitHub workflow, **and the Next.js
   `app/layout.tsx` + `app/page.tsx` shell** (lines 144-159).
4. `installTestingFiles` — Vitest config, **imports `@/app/page`** as
   smoke test.
5. `installSkills` — installs the three `vercel/next.js` skills
   (`next-cache-components-*`, `next-dev-loop`) plus the
   `architecture-decision-records` skill.
6. `installDocsAndClaude` — `AGENTS.md` snapshot
   (`src/templates/files.ts:522-528`) pins the
   `node_modules/next/dist/docs/` agent rule and other Next-specific
   guidance.
7. `installShadcnMcp` — three `shadcn mcp init` calls.

The package-manager abstraction (`src/package-manager.ts`) is already
the right shape: a `PackageManagerCommands` object with a per-PM
factory that exposes `createNextApp` (line 4), `shadcn`, `shadcnMcp`,
`addDev`, `add`, `remove`, `exec`. Renaming `createNextApp` to a generic
`scaffoldApp` and adding a `framework` dimension is the smallest
conceptual change.

The ESLint template (`src/templates/eslint.ts:8-9`) already has a
`registerImportPlugin` escape hatch explicitly added for "future base
frameworks (Astro, TanStack Start, etc.)". That is the seam the
original author was preparing.

## Affected Areas

| File | Why it is affected |
| --- | --- |
| `src/commands/create.ts` | Add `framework` to `RawCreateFlags` and `CreateOptions`; pick `scaffoldApp` per framework; route `installQualityLayer`/`installTestingFiles` to the right template set. |
| `src/installer/next.ts` (rename to `framework.ts`?) | Becomes a framework dispatcher. The current `createNextApp` body is the Next.js branch. Add `createAstroApp` as a sibling. |
| `src/package-manager.ts` | Rename `createNextApp` to `scaffoldApp(framework, targetDir, yes)`. Returns `npx create-astro@latest …` for Astro, current behavior for Next.js. |
| `src/templates/files.ts` | Make `renderRootLayout` and `renderHomePage` framework-aware (or split into per-framework template modules). The `renderAgents` function (line 517+) must drop the `node_modules/next/dist/docs/` block when framework != next. |
| `src/templates/eslint.ts` | Use the existing `registerImportPlugin: true` for Astro. Astro config is JS in `astro.config.mjs` and does not ship `eslint-config-next`, so we must register `eslint-plugin-import` ourselves. |
| `src/installer/quality.ts` | The `writeAppShell` helper (lines 144-159) must become framework-aware. pnpm-workspace hardening at lines 206-214 stays Next-only (React Doctor supply-chain requirement), or becomes optional. |
| `src/installer/testing.ts` | The unit smoke test currently imports `@/app/page`. For Astro, the home is `src/pages/index.astro` and the smoke test must be a different shape (Astro component test via `astro check` or vitest-astro). The simplest path is to skip the unit smoke for Astro or run `astro check` instead. |
| `src/installer/skills.ts` + `src/skill/manifest.ts` | `alwaysExternalSkills` (lines 12-23) must drop the three `vercel/next.js` skills when framework != next. Add equivalent Astro skills (e.g. `withastro/astro` skills if any exist; or rely on `astro` CLI + docs). |
| `src/cli-metadata.ts` | Add `--framework <next|astro>` to `cliOptions` and the scenarios table. Keep `installCommand` and description in sync. |
| `src/cli.ts` | Wire the new flag through Commander. |
| `src/types.ts` | Add `Framework = 'next' | 'astro'`. |
| `README.md`, `llms.txt`, `skills/purrfold/SKILL.md` | Add the new flag to the options table and intent→command table. |
| `tests/dry-run.test.ts` | Add a `--framework astro` dry-run assertion; existing Next assertions stay. |
| `tests/cli-metadata.test.ts` | Extend the `flags` array to include `--framework`. |
| `tests/templates.test.ts` | Add framework-aware snapshot for the Astro home page. |
| `scripts/e2e/scenarios.mjs` | Add at least one quick dry-run scenario for Astro and one real npm-spawned scenario behind a `requires: ['create-astro']` guard. |

## Approaches

### Option A — `scaffoldApp` slot with `--framework <next|astro>` (recommended)

Introduce a `Framework` union and a single new flag. Default to
`next`, so every existing command (`purrfold my-app --yes`) keeps
behaving identically. Astro is opt-in.

- Pros: zero behavioral change for current users; the diff is
  contained to the seam identified above; default-first is the
  safest rollout.
- Cons: doubles the test matrix for the quality layer and skills
  selection; we have to maintain two template branches.
- Effort: Medium. The first slice is ~300-450 lines of changed code
  plus a matching test delta.

### Option B — Subcommand (`purrfold next …` / `purrfold astro …`)

Replace the default `create` command with two named subcommands.
`purrfold <dir>` becomes a deprecated alias for `purrfold next <dir>`.

- Pros: cleaner long-term API; easier to add a third framework later
  (TanStack Start, Remix, Nuxt); clearer in `--help`.
- Cons: breaking change for every existing user, scripts, and the
  published `purrfold` skill. README, llms.txt, scenarios, and the
  every doc table need to be rewritten. Heavier release (likely
  `minor` not `patch`).
- Effort: Medium-High, mostly in docs and existing scenarios.

### Option C — Plugin system

Each framework is a separate npm package consumed by purrfold via
dynamic import.

- Pros: scales to N frameworks; community can ship framework adapters.
- Cons: wildly out of proportion for "Next + Astro". Overkill.

## Recommendation

**Adopt Option A** for the first release.

It is the minimum viable refactor that:

1. Keeps Next.js as the default (every existing command, CI scenario,
   and downstream user keeps working).
2. Introduces a single `Framework` enum and a `scaffoldApp(framework)`
   slot in the package-manager abstraction.
3. Reuses the existing `registerImportPlugin` escape hatch in the
   ESLint template.
4. Keeps the slice reviewable (one PR per work unit below 400 lines).

`--framework` is the smallest user-facing surface. It mirrors how
`--pm` already encodes an orthogonal choice (package manager) and
plays nicely with every existing flag including `--shadcn-args`.

For the Astro path specifically, use the two-step shellout:

- `pnpm create astro@latest <dir> -- --template minimal --add react --add tailwind --yes --no-git --install --skip-houston --no-ai`
- then `pnpm dlx shadcn@latest init -t astro --yes` (or, if a
  `--shadcn-args --preset <id>` is provided, swap to
  `pnpm dlx shadcn@latest init -t astro --preset <id> --yes`).

The `--no-ai` flag is important: `create-astro` will otherwise create
its own `agents.md`/`AGENTS.md` and Claude/Codex files that
duplicate purrfold's output.

## Proposed user-facing shape

```
purrfold my-app --framework astro --yes        # Astro, defaults
purrfold my-app --framework astro --no-shadcn # Astro without shadcn
purrfold my-app --yes                          # unchanged, still Next.js
purrfold my-app --framework astro --icons phosphor --yes
purrfold my-app --framework astro --shadcn-args --preset b3REw8vwo --yes
```

`--framework` joins `--pm` in `cli-metadata.ts` and is added to the
`info --json` schema. The README, `llms.txt`, and
`skills/purrfold/SKILL.md` get a new row in the intent→command table.

## Smallest viable Astro slice (Option A work units)

Work units are ordered so each commit is independently reviewable
and keeps `npm run check` green.

1. **Refactor the seam (no behavior change)**
   - Rename `createNextApp` to `scaffoldApp` in
     `src/package-manager.ts` and `src/installer/next.ts`.
   - Introduce `Framework = 'next'` in `src/types.ts`. No user-facing
     flag yet.
   - Update `tests/package-manager.test.ts` to use the renamed slot.
   - **Work unit = 1 commit, ~80 LOC.**

2. **Add `--framework` flag + framework dispatch**
   - Add `Framework = 'next' | 'astro'`, the flag, prompt, default.
   - Wire `runCreate` to pick a per-framework quality + testing
     pipeline.
   - Extend `cli-metadata.ts`, `cli.ts`, and the
     `tests/cli-metadata.test.ts` flag assertion.
   - **Work unit = 1 commit, ~120 LOC.**

3. **Astro scaffolding (shellout + writeAppShell branch)**
   - Add `createAstroApp` in a new `src/installer/astro.ts` (or extend
     `next.ts` with a framework dispatcher — prefer a sibling module
     to keep `next.ts` small).
   - Add Astro home page + layout templates
     (`src/templates/files.ts` gains `renderAstroLayout` and
     `renderAstroHomePage`).
   - Branch the `writeAppShell` helper in
     `src/installer/quality.ts`.
   - Add at least one dry-run scenario in `scripts/e2e/scenarios.mjs`.
   - **Work unit = 1 commit, ~200 LOC + tests.**

4. **Astro quality + docs (eslint registerImportPlugin, AGENTS, README)**
   - Switch the `renderEslintConfig` to `registerImportPlugin: true`
     when framework = astro.
   - Add a new local skill `astro-conventions` (or reuse existing).
   - Drop the three `vercel/next.js` skills from
     `selectSkillNames` for Astro, and replace with the most
     appropriate Astro skills (currently no equivalent exists
     upstream; document this as a gap).
   - Update `AGENTS.md`, `DESIGN.md`, `README.md`, `llms.txt`,
     `skills/purrfold/SKILL.md`.
   - **Work unit = 1 commit, ~150 LOC + docs.**

5. **Astro testing + verification**
   - Skip the `tests/unit/home.test.tsx` smoke (Vitest+RTL cannot
     mount `.astro` without a Vite plugin) and instead run
     `astro check` as part of the generated `check` script.
   - Add one real-spawn npm scenario behind a `requires: ['create-astro']`
     guard, excluded from `quick` and `default` until proven stable.
   - **Work unit = 1 commit, ~100 LOC + tests.**

If any single unit exceeds 400 changed lines, the
`work-unit-commits` skill instructs us to chain it as a follow-up
PR; otherwise the whole Astro release is a single PR.

## Risks

- **Astro `create-astro` writes its own AGENTS.md / Claude files.**
  Without `--no-ai` they will clobber purrfold's. The slice must
  pass `--no-ai` and document this in the design.
- **React Doctor only targets React + Next.js.** For Astro, the
  `eslint-plugin-react-doctor` package will warn on every non-React
  island. We should keep React Doctor for Next.js and either skip
  it for Astro or wrap it in a try/catch in the generated
  `doctor:ci` script. This is the same tradeoff pnpm-hardening
  already encodes.
- **shadcn `init -t astro` writes `components.json` with
  `tailwind.css: "src/styles/globals.css"`.** purrfold's icon library
  reconciliation (which reads `components.json`) must keep working
  through that path. Need a quick test for the Astro icon reconcile.
- **No official Astro MCP server.** The `--mcp` flag cannot be
  ported as-is. For Astro, treat `--mcp` as shadcn-MCP-only and
  document that there is no Astro-native MCP equivalent today.
- **vitest smoke test cannot render `.astro` files.** The Astro unit
  testing story uses `vitest` + `vite-plugin-astro` (or skips
  component tests). The slice must decide: ship a different smoke
  test, or run `astro check` in the gate. v1 recommendation: rely on
  `astro check` until community tooling is stable.
- **Bun's `bunx` does not have first-class `astro add` parity in
  every Astro version.** The e2e matrix should pin the supported
  PM × framework pairs. Default: npm + pnpm fully supported, bun
  best-effort.
- **CI cost.** Real-app `npm run check` for an Astro app takes
  noticeably longer than for Next.js. Keep Astro in `--scenario`
  only, not in the default suite.
- **`create-next-app` is the only command shape we have today.**
  Renaming the slot to `scaffoldApp` is internal but the public type
  surface (`PackageManagerCommands.createNextApp`) is exported.
  Double-check whether it is part of any external contract (it is
  not — the `package.json` `files` is just `dist/README/llms.txt`),
  but document the rename in the changeset regardless.

## Open questions for the orchestrator

1. Is this a single multi-commit PR, or do we want a chained-PR
   layout from the start? My recommendation: single PR for v1; the
   review surface is ~700 LOC across 5 commits, comfortably below
   the 400-line-per-PR threshold for any individual commit.
2. Should `--framework` default to `next` always, or should we
   detect from a future `purrfold.config.json`? My recommendation:
   default to `next`; add a `.purrfoldrc` later if needed.
3. Do we want a follow-up ADR (`docs/adr/0002-framework-abstraction.md`)
   capturing the framework-slot decision? My recommendation: yes, it
   is the same class of decision as ADR-0001.

## Ready for Proposal

**Yes.** The seam is small, the user-facing shape is clear, and the
Astro documentation is well understood. Recommended next phase:
`sdd-propose` to produce the proposal, `sdd-spec` for the delta
spec, `sdd-design` for the per-framework template layout, and
`sdd-tasks` to break the five work units into implementation
commits.
