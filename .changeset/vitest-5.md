---
"purrfold": patch
---

Update `vitest` to v5 in generated apps with unit tests.

Vitest 5 stopped shipping `vite` as a direct dependency, which is why this bump needed `vite` declared explicitly first: generated apps install with `--legacy-peer-deps`, and npm does not install peers under that flag.
