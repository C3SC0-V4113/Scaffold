---
"purrfold": patch
---

Pin the dev dependencies purrfold installs into generated apps to known-good
versions (`DEPENDENCY_VERSIONS` in `src/installers/config-model.ts`). Previously
the tooling was installed by bare name, so `bun add` resolved to the absolute
latest and escaped create-next-app's existing ranges — pulling in ESLint 10,
which removed `context.getFilename()` and crashed `eslint-plugin-react`, so
`eslint .` failed only under bun. Installs now use explicit `name@version`
specifiers, keeping npm, pnpm, and bun on the same versions. ESLint stays on v9
until `eslint-plugin-react` supports v10. create-next-app and shadcn remain on
`@latest` by design.
