---
"purrfold": patch
---

Update `prettier-plugin-astro` to its first stable major in generated Astro apps.

It only changes how Prettier formats `.astro` files, so the blast radius is the generated project's `format` script and the `--check` inside its own quality gate. Every Astro E2E scenario passes on it, including the three that run the generated app's `npm run check`.
