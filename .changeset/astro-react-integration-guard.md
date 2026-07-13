---
"purrfold": patch
---

Verify the Astro React integration after create-astro and recover automatically. create-astro's `--add react` step can fail while still exiting 0 (it prints "Failed to add integrations" and finishes the scaffold), which produced generated apps whose React components could not typecheck. purrfold now checks that `@astrojs/react` landed in package.json and `react()` in astro.config.mjs, runs `astro add react --yes` itself when missing, and fails with a clear message instead of shipping a broken app if recovery is impossible.
