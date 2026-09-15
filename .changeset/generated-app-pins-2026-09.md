---
"purrfold": patch
---

Update the dependency versions pinned into generated apps. Notably, `react-doctor` and `eslint-plugin-react-doctor` move to `0.9.14`, which retires 33 low-value rule IDs and makes 26 cleanup, migration, performance, and security-review rules opt-in, so default scans in a freshly generated app report fewer recommendations. Retired IDs stay registered as compatibility entries, so the rule overrides purrfold writes into the generated ESLint config still load. `motion` moves to `13.3.0`, `lucide-react` to `1.46.0`, `eslint-plugin-playwright` to `2.12.0`, and the fallback `packageManager` pnpm — written only when purrfold cannot probe the installed pnpm — to `12.4.1`. The remaining pins are patch releases.
