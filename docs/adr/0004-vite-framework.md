# ADR-0004: Scaffold Vite before initializing shadcn

**Status**: Accepted  
**Date**: 2026-10-14

## Context

purrfold needs a Vite React starter that works non-interactively with npm,
pnpm, and bun. The generated app must use Tailwind v4 through
`@tailwindcss/vite`, an `@/*` alias, and the selected package manager's lockfile.
The scaffolding flow must keep the target directory and package manager under
purrfold's control.

## Spike

Both candidate flows were run without a TTY for npm, pnpm, and bun using the
current `@latest` tools in disposable directories under
`~/.cache/purrfold-pr2`.

### A. `shadcn init -t vite`

The command creates the Vite app itself and installs dependencies using the
invoking package manager. Its non-interactive command was:

```sh
<pm-specific shadcn launcher> init -t vite --preset nova --yes --no-monorepo \
  --cwd <parent> --name <project-name>
```

All three package managers completed and created their matching lockfile. The
`--yes` flag alone did not suppress the preset selection prompt; an explicit
`--preset nova` was required. `--defaults` selects the default Next template,
and `--base` chooses the component library (`base`, `radix`, or `aria`), not a
colour. The preset fixes the appearance choice.

### B. `create-vite` followed by Tailwind and shadcn

The command sequence used each package manager's create, install, add, and
shadcn commands:

```sh
<pm-specific create command> <project> --template react-ts --no-interactive --no-immediate
<pm install>
<pm add dev> tailwindcss @tailwindcss/vite
# Configure the Tailwind Vite plugin and @/* aliases in vite.config.ts and
# tsconfig.app.json, and import Tailwind in src/index.css.
<pm-specific shadcn launcher> init -t vite --defaults --no-monorepo --cwd <project>
```

This sequence also completed without prompts for npm, pnpm, and bun. Each
created the expected package-manager lockfile, and shadcn detected Vite,
Tailwind v4, and the import alias before initializing the project. A separate
non-TTY npm run of `init -t vite --defaults --no-monorepo` on an existing Vite
project completed without prompting and wrote `style: "base-nova"`. The
`--defaults` default is shared by the Next and Astro templates, so omitting an
explicit preset keeps the Vite result aligned with them while preserving the
interactive preset prompt when `--defaults` is absent. A user-supplied
`--shadcn-args --preset <id>` continues to select an explicit preset.

## Decision

Use flow B. purrfold invokes `create-vite` with an explicit React TypeScript
template and non-interactive flags, then owns Tailwind setup, aliases, and the
shadcn initialization step. It keeps the chosen target path and package manager
visible and explicit throughout the pipeline instead of delegating initial
project creation to shadcn. Invoke shadcn with `--defaults` only for
non-interactive runs and `--no-monorepo`; shadcn's own default selects
`base-nova` for the supported framework templates. Leave the preset unset
during interactive runs so users can choose one.

## Consequences

**Good**: The Vite starter and its options are explicit; npm, pnpm, and bun all
retain their own lockfile; shadcn validates the Tailwind and alias setup before
writing its config and components.

**Trade-off**: purrfold must maintain the Vite/Tailwind/alias configuration
steps itself. `shadcn init -t vite` remains a viable shortcut, but requires the
same framework and alias setup and gives shadcn ownership of the initial
scaffold.

## Version policy

Vite and `@vitejs/plugin-react` follow their exact pins in `src/versions.json`.
The versions are shared with the other React framework adapters; the scaffold
does not keep the newer ranges emitted by `create-vite@latest`. Framework major
upgrades happen through the deliberate Renovate pin update and its changeset.
The Vite configuration template is validated against the currently pinned
Vite major. For a Vite major bump, run the generated app's full check and Vite
real E2E scenarios, then confirm plugin registration, aliases, Tailwind v4,
and the Vite config API still work before accepting the pin.
