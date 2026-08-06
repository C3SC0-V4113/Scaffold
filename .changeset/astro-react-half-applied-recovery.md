---
'purrfold': patch
---

Recover Astro scaffolds when `create-astro` writes the React integration into
`astro.config.mjs` without installing `@astrojs/react`.

purrfold already re-ran `astro add react --yes` whenever the integration was
missing, but that cannot repair this particular half-applied state: `astro add`
has to load the config in order to edit it, and the config imports the package
that was never installed, so astro exits with `Cannot find module
'@astrojs/react'` before doing any work — the tool meant to repair the damage is
blocked by the damage.

Nothing needs rewriting there: `create-astro` already put `react()` where it
belongs, so purrfold now installs the missing dependency on its own, which
completes the integration. Every other broken state still goes through
`astro add`, and a failed install falls through to it rather than aborting the
scaffold, so this path can only add a chance to recover.
