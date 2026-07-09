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
    name: 'astro-npm-ssg-unit',
    kind: 'real',
    framework: 'astro',
    packageManager: 'npm',
    args: ['--framework', 'astro', '--pm', 'npm', '--unit', '--no-e2e', '--no-commitlint', '--yes'],
    expect: { unit: true, e2e: false, commitlint: false, pnpm: false, mcp: false },
    quick: false,
  },
  {
    name: 'astro-pnpm-ssg-e2e',
    kind: 'real',
    framework: 'astro',
    packageManager: 'pnpm',
    args: ['--framework', 'astro', '--pm', 'pnpm', '--unit', '--e2e', '--no-commitlint', '--yes'],
    expect: { unit: true, e2e: true, commitlint: false, pnpm: true, mcp: false },
    quick: false,
  },
  {
    name: 'astro-npm-ssr-node',
    kind: 'real',
    framework: 'astro',
    packageManager: 'npm',
    ssrAdapter: 'node',
    args: [
      '--framework',
      'astro',
      '--pm',
      'npm',
      '--ssr',
      '--adapter',
      'node',
      '--no-unit',
      '--no-e2e',
      '--commitlint',
      '--yes',
    ],
    expect: { unit: false, e2e: false, commitlint: true, pnpm: false, mcp: false },
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
    name: 'dry-run-reported-b6-mcp-npm',
    kind: 'dry-run',
    packageManager: 'npm',
    // Mirrors the reported command:
    // npx purrfold@latest tlh-portal --shadcn-args --preset b6FS5q9aq --yes --mcp
    args: ['--yes', '--dry-run', '--mcp', '--shadcn-args', '--preset', 'b6FS5q9aq'],
    expectOutput: [
      'run npx shadcn@latest init --defaults --preset b6FS5q9aq',
      'vitest@4.1.8',
      '@vitejs/plugin-react@5.1.2',
      'vite-tsconfig-paths@5.1.4',
      'run npx shadcn@latest mcp init --client claude',
      'run npx shadcn@latest mcp init --client codex',
      'run npx shadcn@latest mcp init --client opencode',
    ],
    rejectOutput: ['@vitejs/plugin-react@6.0.2', 'vite@7.2.7'],
    quick: true,
  },
  {
    name: 'dry-run-astro-ssg-npm',
    kind: 'dry-run',
    framework: 'astro',
    packageManager: 'npm',
    args: ['--framework', 'astro', '--pm', 'npm', '--unit', '--e2e', '--no-commitlint', '--yes', '--dry-run'],
    expectOutput: [
      'run npm create astro@latest',
      'run npx shadcn@latest init -t astro --defaults',
      '@vitejs/plugin-react@5.2.0',
      'react-doctor@0.5.4',
    ],
    rejectOutput: ['create-next-app@latest', '@vitejs/plugin-react@5.1.2'],
    quick: true,
  },
  {
    name: 'dry-run-astro-ssr-cloudflare-pnpm',
    kind: 'dry-run',
    framework: 'astro',
    packageManager: 'pnpm',
    args: [
      '--framework',
      'astro',
      '--pm',
      'pnpm',
      '--ssr',
      '--adapter',
      'cloudflare',
      '--no-unit',
      '--no-e2e',
      '--no-commitlint',
      '--yes',
      '--dry-run',
    ],
    expectOutput: [
      'run pnpm create astro@latest',
      'run pnpm add @astrojs/cloudflare@14.1.2',
      'run pnpm dlx shadcn@latest init -t astro --defaults',
    ],
    rejectOutput: ['create-next-app@latest'],
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

export function selectScenarios({ quick = false, heavy = false, names = [], framework } = {}) {
  // Explicit names win and can reach any scenario, heavy ones included.
  if (names.length > 0) {
    return cliE2eScenarios.filter((scenario) => names.includes(scenario.name));
  }
  const matchesFramework = (scenario) =>
    framework === undefined || (scenario.framework ?? 'next') === framework;
  if (heavy) {
    return cliE2eScenarios.filter((scenario) => scenario.heavy && matchesFramework(scenario));
  }
  if (quick) {
    return cliE2eScenarios.filter((scenario) => scenario.quick && matchesFramework(scenario));
  }
  // Default routine suite: everything except the extra-heavy scenarios.
  return cliE2eScenarios.filter((scenario) => !scenario.heavy && matchesFramework(scenario));
}

export function scenarioNames() {
  return cliE2eScenarios.map((scenario) => scenario.name);
}
