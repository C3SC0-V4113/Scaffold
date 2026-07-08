# Design: Add Astro as a First-Class Framework Option

## Technical Approach

Introduce a small framework registry, not a full plugin system. `create.ts` resolves `framework` first, defaults to `next`, then routes creation/app-shell/docs/skills/quality variants through framework definitions while keeping shared installers reused where they are genuinely React-shared.

## Architecture Decisions

| Decision | Choice | Tradeoff / Rationale |
|---|---|---|
| Framework abstraction | Add `Framework = 'next' | 'astro'` and `FrameworkDefinition` registry with create command, shadcn init mode, app-shell renderer, docs metadata, skill groups, and script/eslint mode. | Avoids scattering `if astro` everywhere without overbuilding a generic plugin system for two frameworks. |
| Prompt flow | Add `--framework <next|astro>`; in interactive mode ask framework as the first prompt with Next.js default. `--yes` and omitted framework stay Next.js. | Preserves current automation while making framework explicit for humans. |
| Astro creation | Use official latest Astro path: `npm create astro@latest <dir> -- --template with-tailwindcss --install --add react --git`; pnpm equivalent without the extra npm separator. Then run `shadcn init --template astro` plus user `shadcnArgs`. | Keeps Astro latest and React-ready for shadcn; avoids stale template-first scaffolding. |
| Bun for Astro | Reject `--framework astro --pm bun` with an actionable error until verified. | Conflicts with broad PM parity, but matches clarification to omit Bun unless verified; existing Bun+Next remains supported. |
| Markdown docs | Replace full README/AGENTS/CLAUDE rewrites with marker-based upsert helpers: preserve existing generated markdown and only insert/update Purrfold managed sections; create `CLAUDE.md` pointer only when absent or managed. | Protects Astro/Next starter docs while keeping agent guidance deterministic. |
| Skills catalog | Classify skills as `react-shared`, `next-only`, optional test skills, and `astro-reference`. Astro installs shared React/shadcn/testing skills, skips Next-only skills, and may document the community Astro skill reference without auto-installing it. | Prevents false Next guidance in Astro projects while keeping useful React guidance. |
| ADR | Add `docs/adr/0002-add-framework-registry-for-astro.md` as Accepted. | Framework adoption and registry seam are durable architecture decisions. |

## Data Flow

```text
CLI flags/prompts -> CreateOptions.framework -> framework registry
  -> create framework app -> shadcn init mode -> shared quality/testing/docs/skills
  -> generated app check
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/types.ts` | Modify | Add `Framework`, `framework` in `CreateOptions`, and registry-facing contracts. |
| `src/frameworks/registry.ts` | Create | Own supported frameworks, defaults, validation, and per-framework metadata. |
| `src/installers/astro.ts` | Create | Validate target dir and run Astro latest + React creation. |
| `src/installers/next.ts` | Modify | Keep Next creation behind registry contract. |
| `src/package-manager.ts` | Modify | Add Astro create commands for npm/pnpm; intentionally no Bun Astro command. |
| `src/commands/create.ts`, `src/cli.ts`, `src/cli-metadata.ts` | Modify | Add framework flag, first prompt, validation, scenarios, `info --json`. |
| `src/installers/shadcn.ts` | Modify | Use Next defaults for Next; explicit `--template astro` for Astro. |
| `src/installers/config-model.ts`, `src/templates/eslint.ts`, `src/installers/quality.ts`, `src/installers/testing.ts` | Modify | Split framework-specific deps/scripts/eslint/app-shell/test imports. Astro uses `astro dev`, Astro files, and React-compatible tests. |
| `src/installers/docs.ts`, `src/templates/files.ts`, `src/templates/skills.ts`, `src/installers/skills.ts`, `src/skills/manifest.ts` | Modify | Marker-preserved docs and framework-aware skill selection. |
| `README.md`, `llms.txt`, `skills/purrfold/SKILL.md` | Modify | Mirror metadata and intent-to-command table for both frameworks. |
| `docs/adr/0002-add-framework-registry-for-astro.md` | Create | Record framework registry/Astro decision. |
| `tests/**` | Modify/Create | Cover defaults, invalid framework, Astro dry-run, Bun rejection, docs preservation, skill filtering, scripts/templates. |

## Interfaces / Contracts

```ts
type Framework = 'next' | 'astro';
interface FrameworkDefinition {
  id: Framework;
  label: string;
  create(options: CreateOptions, executor: Executor): Promise<string>;
  shadcnTemplate: 'next' | 'astro';
  supportsPackageManager(pm: PackageManager): boolean;
  docs: { editPath: string; frameworkName: string; agentRules: string };
  skills: { shared: string[]; frameworkSpecific: string[]; references?: string[] };
}
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Framework validation, command builders, docs upsert, skill selection | Vitest table tests. |
| Integration | Dry-run for Next stability and Astro npm/pnpm command order | Extend `dry-run.test.ts`. |
| E2E | Real app generation | Add quick dry-run now; keep heavy Astro npm/pnpm real generation outside `npm run check` until stable. |

## Migration / Rollout

No data migration required. Release as a minor feature with Changeset. Keep Next as default and add Astro behind explicit `--framework astro`.

## Risks / Assumptions

- Astro ESLint cannot reuse `eslint-config-next`; dependency/config split must be verified.
- `shadcn init --template astro` may interact with presets differently than Next defaults.
- Bun+Astro is intentionally unsupported until a verified path exists.

## Open Questions

None blocking.
