---
'purrfold': patch
---

Make a freshly generated project pass its own `npm run check`.

The scaffold already ran `lint:fix` and `format` as its last step, but a failing `shadcn mcp init` aborted the whole run before reaching them, shipping a project that failed its own quality gate. Wiring an MCP client is a convenience around a third-party CLI that hits the network and the app works without it, so a failure now warns and the run continues.

Two template defects the aborted tail had been masking are fixed at the source: the Astro hero emitted its internal import before the external one with no blank line, violating the `import/order` rule the generated ESLint config itself enables, and `@types/canvas-confetti` was left behind when the starter's `canvas-confetti` dependency was removed, leaving a type package with no runtime package and no usage. `lint:fix` now also runs for Next projects, not only Astro.
