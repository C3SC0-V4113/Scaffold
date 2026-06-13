---
"purrfold": patch
---

Fix generated apps that failed their own `check`.

- Stop re-registering the `import` ESLint plugin because `eslint-config-next`
  already provides it, avoiding `Cannot redefine plugin "import"` under pnpm.
- Ignore vendored `components/ui/**` shadcn primitives in ESLint so radix/cva
  imports no longer fail `import/order`; the files remain type-checked and
  formatted.
- Merge React Doctor's pnpm hardening settings into `pnpm-workspace.yaml`
  without dropping existing keys.
