---
"purrfold": patch
---

Add optional shadcn MCP setup and document shadcn preset compatibility.

- Add `--mcp / --no-mcp`; `--yes` keeps MCP disabled unless `--mcp` is explicit.
- When enabled, purrfold initializes shadcn MCP for Claude, Codex, and OpenCode
  using the selected package manager.
- Document Codex TOML guidance and official shadcn preset forwarding through
  `--shadcn-args --preset <id>`.
- Expand the release smoke matrix to cover package managers, shadcn presets,
  testing, and commitlint combinations.
