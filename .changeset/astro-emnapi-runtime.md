---
'purrfold': patch
---

Generated Astro apps now install `@emnapi/runtime` as a dev dependency so `astro check` can load `@astrojs/check` and actually typecheck with both npm and pnpm. Previously the typecheck was silently skipped, and on Astro 7.4.6+ `astro check` failed outright. This is a temporary workaround for withastro/compiler-rs#214, and existing apps can drop the dependency once `@astrojs/astro2tsx` declares it.
