---
"purrfold": patch
---

Install purrfold's own agent skills and React Doctor's official skill from their published sources instead of writing them from templates.

Generated apps previously received `project-architecture`, `shadcn-component-boundaries`, `project-min-evaluation`, `decision-doc-sync`, and `react-doctor` as `SKILL.md` files rendered by purrfold. They are now fetched with `npx skills add` alongside the other agent skills: the four purrfold-owned skills from `C3SC0-V4113/Scaffold` in one command, and React Doctor's skill from `millionco/react-doctor`. Both commands are listed in the generated `skills.sh`, so a failed download can be retried with `sh skills.sh`; as before, a download failure is reported but never fails the scaffold.

purrfold now creates `.agents/skills` explicitly before linking `.claude/skills` to it, so the link has a target even when every download fails. React Doctor's dependencies, configuration, `doctor` script, hooks, and quality gates are unchanged.
