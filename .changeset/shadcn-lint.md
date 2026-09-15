---
"purrfold": minor
---

Add `@shadcn/lint` to generated Next.js and Astro apps, with all six rules enabled as errors.

`DESIGN.md` asked for semantic tokens and shadcn variants, but nothing checked it: an agent could restyle a `Button` through `className`, reach for `bg-pink-500` or `p-[13px]`, and still pass `check`. The plugin turns those guardrails into lint errors whose messages explain the fix using the app's own components, variants, and theme, and point back to `DESIGN.md`. `no-restyle` and `no-arbitrary-values` allow layout classes, so pages can still place components. Every rule is an error rather than a warning because generated apps lint with `--max-warnings 0`, where the two are equivalent.

The registry-managed `ui` directory stays out of lint as before, and `.astro` files are not covered because the plugin supports JavaScript and TypeScript sources only.
