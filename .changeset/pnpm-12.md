---
"purrfold": patch
---

Update the fallback `packageManager` pnpm version to `12.3.4`.

The scope is narrower than the major suggests: purrfold prefers the pnpm it can actually probe, so this value is only written when `pnpm --version` cannot be read — in practice, dry runs. A developer on pnpm 11 still gets `pnpm@11.x` in their generated `package.json`. The E2E matrix runs pnpm 10 via `pnpm/action-setup` and therefore does not exercise pnpm 12 itself; what it verifies is that the generated `packageManager` field stays a valid exact version.
