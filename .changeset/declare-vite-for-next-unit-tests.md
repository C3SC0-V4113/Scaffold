---
"purrfold": patch
---

Install `vite` explicitly in generated Next apps that have unit tests, pinned to the 7 line.

Until now nothing declared Vite: it arrived because `vitest@4` listed it under `dependencies`. Vitest 5 moves it to a peer dependency, and generated apps install with `npm install --legacy-peer-deps` (added in 0.7.2 to get past the npm 10 resolver after `shadcn init`), which does not install peers. A Next app on Vitest 5 would therefore fail its own `npm run check` with `Cannot find package 'vite'`.

The 7 line is the only major both Vitest and the pinned `@vitejs/plugin-react@5.1.x` accept — plugin-react gains Vite 8 support in 5.2, which the Next line deliberately does not take. That constraint is now enforced by a Renovate rule instead of being rediscovered later.

Astro apps are untouched: `astro` depends on Vite directly, so declaring it again would pin a second, narrower range against the one Astro already resolved.
