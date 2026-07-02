import type { CreateOptions } from '../types.js';

export const localSkillNames = [
  'project-architecture',
  'project-min-evaluation',
  'decision-doc-sync',
  'react-doctor',
] as const;

export function renderProjectArchitectureSkill() {
  return `---
name: project-architecture
description: Generic project architecture and design guardrails. Use when changing UI, layout, component architecture, state flow, theming, or Next.js server/client boundaries.
---

# Project Architecture Guardrails

Use this skill when a change touches UI, component structure, app behavior, theming, or data display.

## Rules

1. Keep the app server-first unless interactivity requires a client island.
2. Read relevant Next.js docs in \`node_modules/next/dist/docs/\` before changing framework APIs.
3. Use Purrfold-installed supported Next.js workflow skills from \`vercel/next.js\` in \`.agents/skills/\` for Cache Components and dev-loop work when present; rerun \`./skills.sh\` if they are missing.
4. Respect \`DESIGN.md\` for visual and UX decisions.
5. Use shadcn primitives and semantic tokens before custom styling.
6. Add tests proportional to risk.

## Pre-Close Checklist

- Did the change add unnecessary client-side surface?
- Does it follow \`DESIGN.md\`?
- Are loading, empty, and error states explicit?
- Did you run \`.agents/skills/project-min-evaluation/SKILL.md\` before claiming completion?
`;
}

export function renderProjectMinEvaluationSkill(
  options: Pick<CreateOptions, 'packageManager' | 'unit' | 'e2e'>
) {
  const run = options.packageManager === 'npm' ? 'npm run' : `${options.packageManager} run`;

  return `---
name: project-min-evaluation
description: Run the minimum local quality checks before marking implementation work complete.
---

# Project Minimum Evaluation

Run these commands from the repository root before reporting completion:

\`\`\`bash
${run} lint
${run} typecheck
${run} format:check
${options.unit ? `${run} test\n` : ''}${run} doctor
${run} check
\`\`\`

${options.e2e ? `If E2E behavior changed, also run \`${run} test:e2e\`.\n` : ''}
If a check fails or cannot run, report the exact command, exact error, and unverified scope.
`;
}

export function renderDecisionDocSyncSkill() {
  return `---
name: decision-doc-sync
description: Keep documentation synchronized when structural architecture, UI/UX, quality-gate, or cross-cutting conventions change.
---

# Decision Documentation Sync

Use this skill when a change introduces or changes a structural decision.

Review and update affected docs:

1. \`README.md\` for architecture and scripts.
2. \`DESIGN.md\` for visual and UX standards.
3. \`AGENTS.md\` for operational guidance.
4. \`docs/adr/\` when a durable decision record is needed.
`;
}

export function renderReactDoctorSkill(options: Pick<CreateOptions, 'packageManager'>) {
  const exec =
    options.packageManager === 'pnpm'
      ? 'pnpm dlx react-doctor@latest'
      : options.packageManager === 'bun'
        ? 'bunx --bun react-doctor@latest'
        : 'npx react-doctor@latest';

  return `---
name: react-doctor
description: Use when finishing a React feature, fixing React code, before committing, or when asked to run React Doctor diagnostics.
---

# React Doctor

Run React Doctor after React code changes and before completion:

\`\`\`bash
${exec} --verbose --diff
\`\`\`

Use the project scripts for blocking validation:

\`\`\`bash
${options.packageManager === 'npm' ? 'npm run' : `${options.packageManager} run`} doctor
\`\`\`

If the score regresses or warnings appear, fix them before claiming completion.
`;
}
