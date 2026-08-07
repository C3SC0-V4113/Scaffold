---
'purrfold': patch
---

Tell agents to run the generated skills script as `sh skills.sh`, not
`./skills.sh`.

The generated `AGENTS.md` and the `project-architecture` skill both said to
`rerun ./skills.sh` when workflow skills are missing. That command fails with
*permission denied* on Linux and macOS: `installSkills` writes the file through
`Executor.writeFile`, which passes no `mode`, so git records it as `100644` and a
fresh clone has no executable bit. The installer's own failure message already
recommended `sh skills.sh` — the docs simply disagreed with it.

The script itself is unchanged, and still ships at the project root as the
retry path for a scaffold whose external skill fetches failed.
