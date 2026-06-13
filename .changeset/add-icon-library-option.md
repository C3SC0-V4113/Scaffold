---
"purrfold": patch
---

Add `--icons <lucide|phosphor|tabler>` for the generated home-page cat icon.

purrfold now detects the icon library configured by shadcn, keeps it when
supported, otherwise normalizes to lucide. It also ensures exactly the selected
icon package is installed so the generated app does not keep unused icon
dependencies.
