---
"purrfold": patch
---

Point the generated `DESIGN.md` at the stylesheet each framework actually creates.

Astro apps were told to use semantic tokens from `app/globals.css`, a Next.js path that does not exist in an Astro project; their Tailwind entry is `src/styles/global.css`. `DESIGN.md` is now rendered per framework, and the stylesheet mapping lives in one helper shared with the Motion installer instead of being repeated in each.
