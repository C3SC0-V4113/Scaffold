---
"purrfold": patch
---

Update the dependency versions pinned into generated apps.

- Next.js apps: `eslint-config-next` 16.3.6.
- Astro apps: `astro` 7.3.5, `@astrojs/node` 11.1.6, `@astrojs/vercel` 11.0.11, `@astrojs/netlify` 8.2.6, `@astrojs/cloudflare` 14.3.3, and `prettier-plugin-astro` 1.1.0.
- Shared tooling: `@shadcn/lint` 0.2.0, `typescript-eslint` 8.70.1, `prettier` 3.9.9, `vitest` 5.0.1, `jsdom` 30.1.1, `@types/node` 26.6.2, and `@commitlint/cli` / `@commitlint/config-conventional` 21.2.3. `@shadcn/lint` 0.2.0 adds Vue and Svelte support; the rules purrfold configures are unchanged.
- UI libraries: `lucide-react` 1.48.0, `@tabler/icons-react` 3.48.0, and `motion` 13.4.3.
- The `packageManager` fallback for pnpm apps is now `pnpm@12.6.0`.
