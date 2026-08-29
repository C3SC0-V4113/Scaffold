---
'purrfold': patch
---

Load React Scan before React in generated Astro apps.

The Astro layout injected it with `defer`, which postpones the script past React and guaranteed `[React Scan] Failed to load. Must import React Scan before React runs.` on every dev page load of a freshly generated project. The tag now carries neither `defer` nor `async`.

The script URL also pins the `react-scan` version registered in `src/versions.json` instead of tracking whatever unpkg serves as latest, which is what produced the outdated `react-grab` warning alongside the error.
