---
'purrfold': patch
---

Generated Astro apps no longer run `astro check` twice in `check`; `doctor` and `doctor:ci` now run only `react-doctor` because `typecheck` already runs `astro check`, while `doctor:staged` still type-checks staged Astro files before each commit.
