---
'purrfold': patch
---

Fix the Astro SSR + Cloudflare scaffold aborting on pnpm 11.

`workerd` is now pre-approved in `allowBuilds` before `@astrojs/cloudflare` is ever resolved, and the build policy rewrites the `set this to true or false` placeholder pnpm 11 writes for an undecided build script instead of mistaking it for a decided entry. A deliberate `false` is preserved, and build scripts purrfold was not asked to approve are still left undecided rather than silently auto-approving an unvetted postinstall.

The supply-chain hardening also moved to the end of the run. `minimumReleaseAge: 1440` used to land mid-scaffold, so every later `pnpm add` / `pnpm dlx` re-resolved under a 24-hour release floor and one freshly published transitive dependency could take down the rest of the run. Generated pnpm apps now also set `verifyDepsBeforeRun: false`: these policies are applied to a tree that was already resolved without them, and pnpm 11 otherwise re-validates the lockfile before *every* `pnpm run`, failing the app's own `lint`, `format` and `check` whenever any of its hundreds of packages is under a day old. Enforcement is unchanged — `pnpm install` still rejects a lockfile the policies refuse.
