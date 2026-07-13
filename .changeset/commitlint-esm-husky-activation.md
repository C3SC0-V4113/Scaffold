---
"purrfold": patch
---

Fix two quality-gate bugs in generated apps. commitlint config is now written as `commitlint.config.mjs` with ESM syntax: the previous CommonJS `commitlint.config.js` crashed the commit-msg hook in Astro apps, whose package.json sets `"type": "module"`. And husky is now activated explicitly after installing dev dependencies: package managers do not run the `prepare` script on targeted installs (`npm install -D pkg`, `pnpm add`), so generated hooks existed on disk but never ran, letting commits bypass the quality gate until a manual `npm run prepare`. The E2E harness now verifies both functionally (commitlint lints a real message; `git config core.hooksPath` points at .husky).
