export const cliE2eScenarios = [
  {
    name: 'npm-default-unit',
    kind: 'real',
    packageManager: 'npm',
    args: ['--pm', 'npm', '--unit', '--no-e2e', '--no-commitlint', '--yes'],
    expect: { unit: true, e2e: false, commitlint: false, pnpm: false, mcp: false },
    quick: false,
  },
  {
    name: 'pnpm-b3-commitlint',
    kind: 'real',
    packageManager: 'pnpm',
    args: ['--pm', 'pnpm', '--unit', '--no-e2e', '--commitlint', '--shadcn-args', '--preset', 'b3REw8vwo', '--yes'],
    expect: { unit: true, e2e: false, commitlint: true, pnpm: true, mcp: false },
    quick: false,
  },
  {
    name: 'npm-b1-no-tests',
    kind: 'real',
    packageManager: 'npm',
    args: ['--pm', 'npm', '--no-unit', '--no-e2e', '--no-commitlint', '--shadcn-args', '--preset', 'b1sSLwZVp', '--yes'],
    expect: { unit: false, e2e: false, commitlint: false, pnpm: false, mcp: false },
    quick: false,
  },
  {
    name: 'pnpm-b2-e2e',
    kind: 'real',
    packageManager: 'pnpm',
    args: ['--pm', 'pnpm', '--unit', '--e2e', '--no-commitlint', '--shadcn-args', '--preset', 'b2qMI9ufY', '--yes'],
    expect: { unit: true, e2e: true, commitlint: false, pnpm: true, mcp: false },
    quick: false,
  },
  {
    name: 'bun-b5-minimal',
    kind: 'real',
    packageManager: 'bun',
    args: ['--pm', 'bun', '--no-unit', '--no-e2e', '--no-commitlint', '--shadcn-args', '--preset', 'b5eH0WVTX', '--yes'],
    expect: { unit: false, e2e: false, commitlint: false, pnpm: false, mcp: false },
    requires: ['bunx', 'bun'],
    quick: false,
  },
  {
    name: 'dry-run-defaults',
    kind: 'dry-run',
    packageManager: 'npm',
    args: ['--pm', 'npm', '--yes', '--dry-run'],
    expectOutput: ['run npx create-next-app@latest', 'run npx shadcn@latest init --defaults'],
    rejectOutput: ['mcp init --client'],
    quick: true,
  },
  {
    name: 'dry-run-mcp-preset-pnpm',
    kind: 'dry-run',
    packageManager: 'pnpm',
    args: ['--pm', 'pnpm', '--yes', '--dry-run', '--mcp', '--shadcn-args', '--preset', 'b3REw8vwo'],
    expectOutput: [
      'run pnpm dlx shadcn@latest init --defaults --preset b3REw8vwo',
      'run pnpm dlx shadcn@latest mcp init --client claude',
      'run pnpm dlx shadcn@latest mcp init --client codex',
      'run pnpm dlx shadcn@latest mcp init --client opencode',
    ],
    quick: true,
  },
  {
    name: 'interactive-purrfold-prompts',
    kind: 'interactive',
    packageManager: 'npm',
    args: ['--dry-run'],
    input: ['\r', '\r', 'n', '\r', 'n', '\r', 'n', '\r'].join(''),
    expectOutput: ['Package manager', 'Install Vitest + React Testing Library?', 'Install shadcn MCP for Claude, Codex, and OpenCode?'],
    quick: false,
    requiresTty: true,
  },
  {
    name: 'external-shadcn-interactive',
    kind: 'external-shadcn',
    packageManager: 'npm',
    args: ['shadcn@latest', 'init'],
    quick: false,
    requiresTty: true,
  },
];

export function selectScenarios({ quick = false, names = [] } = {}) {
  const selected = quick ? cliE2eScenarios.filter((scenario) => scenario.quick) : cliE2eScenarios;
  if (names.length === 0) {
    return selected;
  }
  return selected.filter((scenario) => names.includes(scenario.name));
}

export function scenarioNames() {
  return cliE2eScenarios.map((scenario) => scenario.name);
}
