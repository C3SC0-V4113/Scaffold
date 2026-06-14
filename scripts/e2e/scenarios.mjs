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
    // Real, no-`--yes` generation: purrfold asks its own prompts, then
    // create-next-app and the external shadcn CLI run interactively (shadcn
    // init without `--defaults`). The harness accepts every default so the end
    // state matches a plain npm default generation, exercising the interactive
    // path end to end including shadcn's own prompts.
    name: 'external-shadcn-interactive',
    kind: 'external-shadcn',
    packageManager: 'npm',
    args: [],
    interactions: [
      { waitFor: 'Package manager', send: '\r' },
      { waitFor: 'Install Vitest', send: '\r' },
      { waitFor: 'Install Playwright', send: '\r' },
      { waitFor: 'Install commitlint', send: '\r' },
      { waitFor: 'Install shadcn MCP', send: '\r' },
      // Emitted by the external tools; absent on some versions, so optional.
      { waitFor: 'Turbopack', send: '\r', optional: true },
      { waitFor: 'base color', send: '\r', optional: true },
    ],
    expect: { unit: true, e2e: false, commitlint: false, pnpm: false, mcp: false },
    quick: false,
    requiresTty: true,
    // A real, network-bound, interactive generation: too slow and timing-
    // fragile for the routine suite, so it is excluded from the default run and
    // only executed via the heavy command or an explicit --scenario selection.
    heavy: true,
  },
];

export function selectScenarios({ quick = false, heavy = false, names = [] } = {}) {
  // Explicit names win and can reach any scenario, heavy ones included.
  if (names.length > 0) {
    return cliE2eScenarios.filter((scenario) => names.includes(scenario.name));
  }
  if (heavy) {
    return cliE2eScenarios.filter((scenario) => scenario.heavy);
  }
  if (quick) {
    return cliE2eScenarios.filter((scenario) => scenario.quick);
  }
  // Default routine suite: everything except the extra-heavy scenarios.
  return cliE2eScenarios.filter((scenario) => !scenario.heavy);
}

export function scenarioNames() {
  return cliE2eScenarios.map((scenario) => scenario.name);
}
