---
'purrfold': patch
---

Generated Astro apps no longer install `@emnapi/runtime` as a dev dependency. `@astrojs/astro2tsx` 0.1.4 now declares it itself (withastro/compiler-rs#214), so `astro check` loads `@astrojs/check` and typechecks without the workaround. Existing apps can remove `@emnapi/runtime` from their `devDependencies`.
