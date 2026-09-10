---
"purrfold": patch
---

Update the `pnpm/action-setup` pin that generated CI workflows reference.

It lands in `.github/workflows/` of every app scaffolded with `--ci`, so apps generated from here on run the current action instead of keeping a stale one forever. The SHA moves together with its version comment, as `tests/workflow-pinning.test.ts` requires.
