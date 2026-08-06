import { pinnedDependency } from './catalog.mjs';

// Real generation runs on Ubuntu for every scenario. A couple of representative
// scenarios also run on Windows and macOS, because scaffolding failures are
// frequently OS-specific: the harness carries a pile of Windows-only machinery
// (executable resolution through where.exe, .cmd shims, junctions, a Node binary
// hardlink) that dry-run scenarios never reach.
export const defaultRunners = ['ubuntu-latest'];
export const crossPlatformRunners = ['ubuntu-latest', 'windows-latest', 'macos-latest'];

export const cliE2eScenarios = [
  {
    name: 'npm-default-unit',
    kind: 'real',
    packageManager: 'npm',
    // Cross-platform representative for Next.js. npm on purpose: the pnpm
    // toolchain forwarder is the least-proven code in the harness, so it earns
    // multi-OS coverage as its own deliberate step rather than riding along here.
    execution: { requires: ['npm'], os: crossPlatformRunners },
    args: ['--pm', 'npm', '--unit', '--no-e2e', '--ci', '--no-commitlint', '--motion', '--yes'],
    // The only scenario asserting that external skills were actually fetched.
    // It carries the check because it is the cross-platform representative, and
    // Windows is exactly where that failure went unnoticed. It also carries
    // `--ci`, which puts the npm branch of the workflow templates on all three
    // runners at no extra install cost.
    expect: {
      unit: true,
      e2e: false,
      ci: true,
      commitlint: false,
      pnpm: false,
      mcp: false,
      motion: true,
      externalSkills: true,
    },
    quick: false,
  },
  {
    name: 'pnpm-b3-commitlint',
    kind: 'real',
    packageManager: 'pnpm',
    // The cross-platform pnpm representative, and the only scenario that puts
    // createPnpmToolchain on a non-Linux runner: the .cmd forwarder, the junction
    // and the Node hardlink are Windows-only code that no real scenario reached
    // before. The lightest pnpm scenario carries it on purpose — the other two
    // install Playwright browsers, which would triple that download for no extra
    // coverage of the toolchain itself.
    execution: { requires: ['pnpm'], os: crossPlatformRunners },
    args: ['--pm', 'pnpm', '--unit', '--no-e2e', '--commitlint', '--shadcn-args', '--preset', 'b3REw8vwo', '--yes'],
    expect: { unit: true, e2e: false, commitlint: true, pnpm: true, mcp: false },
    quick: false,
  },
  {
    name: 'npm-b1-no-tests',
    kind: 'real',
    packageManager: 'npm',
    execution: { requires: ['npm'] },
    args: ['--pm', 'npm', '--no-unit', '--no-e2e', '--no-commitlint', '--shadcn-args', '--preset', 'b1sSLwZVp', '--yes'],
    expect: { unit: false, e2e: false, commitlint: false, pnpm: false, mcp: false },
    quick: false,
  },
  {
    name: 'pnpm-b2-e2e',
    kind: 'real',
    packageManager: 'pnpm',
    execution: { requires: ['pnpm'] },
    // Carries `--ci`: the only real scenario that generates both workflows, and
    // it does so on the pnpm branch, which is the one with a package-manager
    // setup step to get wrong.
    args: ['--pm', 'pnpm', '--unit', '--e2e', '--ci', '--no-commitlint', '--shadcn-args', '--preset', 'b2qMI9ufY', '--yes'],
    expect: { unit: true, e2e: true, ci: true, commitlint: false, pnpm: true, mcp: false },
    quick: false,
  },
  {
    name: 'bun-b5-minimal',
    kind: 'real',
    packageManager: 'bun',
    execution: { requires: ['bun', 'bunx'] },
    args: ['--pm', 'bun', '--no-unit', '--no-e2e', '--no-commitlint', '--shadcn-args', '--preset', 'b5eH0WVTX', '--yes'],
    expect: { unit: false, e2e: false, commitlint: false, pnpm: false, mcp: false },
    quick: false,
  },
  {
    // Isolated CI scenario: `--ci` with every other optional feature off, so a
    // regression in workflow generation cannot hide behind unit/e2e/commitlint
    // output. `--skip-install` keeps it cheap — the workflows are pure file
    // writes and need no dependency tree to validate.
    name: 'npm-ci-only',
    kind: 'real',
    packageManager: 'npm',
    execution: { requires: ['npm'] },
    args: ['--pm', 'npm', '--ci', '--no-unit', '--no-e2e', '--no-commitlint', '--skip-install', '--yes'],
    expect: {
      unit: false,
      e2e: false,
      ci: true,
      commitlint: false,
      pnpm: false,
      mcp: false,
      skipInstall: true,
    },
    quick: false,
  },
  {
    // The only scenario that generates a bun workflow. bun is the third package
    // manager branch of the templates and the one whose setup action
    // (oven-sh/setup-bun) is third-party, so this is where a broken SHA pin or
    // a missing version comment surfaces in real generated output.
    name: 'bun-ci-workflows',
    kind: 'real',
    packageManager: 'bun',
    execution: { requires: ['bun', 'bunx'] },
    args: ['--pm', 'bun', '--ci', '--e2e', '--no-unit', '--no-commitlint', '--skip-install', '--yes'],
    expect: {
      unit: false,
      e2e: true,
      ci: true,
      commitlint: false,
      pnpm: false,
      mcp: false,
      skipInstall: true,
    },
    quick: false,
  },
  {
    name: 'npm-skip-install-repo',
    kind: 'real',
    packageManager: 'npm',
    execution: { requires: ['npm'] },
    args: ['--pm', 'npm', '--no-unit', '--no-e2e', '--no-commitlint', '--skip-install', '--yes'],
    expect: {
      unit: false,
      e2e: false,
      commitlint: false,
      pnpm: false,
      mcp: false,
      skipInstall: true,
    },
    quick: false,
  },
  {
    name: 'astro-npm-ssg-unit',
    kind: 'real',
    framework: 'astro',
    packageManager: 'npm',
    // Cross-platform representative for Astro.
    execution: { requires: ['npm'], os: crossPlatformRunners },
    args: ['--framework', 'astro', '--pm', 'npm', '--unit', '--no-e2e', '--no-commitlint', '--motion', '--yes'],
    expect: { unit: true, e2e: false, commitlint: false, pnpm: false, mcp: false, motion: true },
    verifyDoctorDesign: true,
    quick: false,
  },
  {
    name: 'astro-pnpm-ssg-e2e',
    kind: 'real',
    framework: 'astro',
    packageManager: 'pnpm',
    execution: { requires: ['pnpm'] },
    args: ['--framework', 'astro', '--pm', 'pnpm', '--unit', '--e2e', '--no-commitlint', '--yes'],
    expect: { unit: true, e2e: true, commitlint: false, pnpm: true, mcp: false },
    quick: false,
  },
  {
    name: 'astro-npm-ssr-node',
    kind: 'real',
    framework: 'astro',
    packageManager: 'npm',
    execution: { requires: ['npm'] },
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
    expectOutput: [
      'run npx create-next-app@latest',
      '--disable-git',
      'run git init --initial-branch=main',
      'run npx shadcn@latest init --defaults',
      'README.md',
      'AGENTS.md',
      'CLAUDE.md',
      'DESIGN.md',
      'settings.json',
    ],
    // Workflow filenames are matched bare because output paths carry native
    // separators and this list is compared as a raw substring.
    rejectOutput: [
      'mcp init --client',
      pinnedDependency('motion'),
      'motion-framer',
      'quality.yml',
      'playwright.yml',
    ],
    quick: true,
  },
  {
    name: 'dry-run-ci-workflows',
    kind: 'dry-run',
    packageManager: 'npm',
    // Proves the built CLI emits workflows at all. The full gating matrix
    // (--ci without --e2e, --e2e without --ci) is covered far more cheaply by
    // tests/dry-run.test.ts and does not need a scenario each.
    args: ['--pm', 'npm', '--ci', '--e2e', '--yes', '--dry-run'],
    expectOutput: ['quality.yml', 'playwright.yml'],
    quick: true,
  },
  {
    name: 'dry-run-motion-next-npm',
    kind: 'dry-run',
    packageManager: 'npm',
    args: ['--pm', 'npm', '--motion', '--yes', '--dry-run'],
    expectOutput: [
      `run npm install ${pinnedDependency('motion')}`,
      'freshtechbro/claudedesignskills --skill motion-framer',
    ],
    quick: true,
  },
  {
    name: 'dry-run-motion-astro-pnpm',
    kind: 'dry-run',
    framework: 'astro',
    packageManager: 'pnpm',
    args: ['--framework', 'astro', '--pm', 'pnpm', '--motion', '--yes', '--dry-run'],
    expectOutput: [
      `run pnpm add ${pinnedDependency('motion')}`,
      'freshtechbro/claudedesignskills --skill motion-framer',
    ],
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
      pinnedDependency('vitest'),
      pinnedDependency('@vitejs/plugin-react'),
      pinnedDependency('vite-tsconfig-paths'),
      'run npx shadcn@latest mcp init --client claude',
      'run npx shadcn@latest mcp init --client codex',
      'run npx shadcn@latest mcp init --client opencode',
    ],
    // Known-bad resolutions from the original bug report, kept literal on purpose.
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
      '--no-git',
      'run git init --initial-branch=main',
      'run npx shadcn@latest init -t astro --defaults',
      pinnedDependency('@vitejs/plugin-react', 'astro'),
      pinnedDependency('react-doctor'),
      'README.md',
      'AGENTS.md',
      'CLAUDE.md',
      'DESIGN.md',
      'settings.json',
    ],
    rejectOutput: ['create-next-app@latest', pinnedDependency('@vitejs/plugin-react')],
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
      `run pnpm add ${pinnedDependency('@astrojs/cloudflare')}`,
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
    interactions: [
      { waitFor: 'Framework', send: '\r' },
      { waitFor: 'Package manager', send: '\r' },
      { waitFor: 'Install Vitest', send: '\r' },
      { waitFor: 'Install Playwright', send: 'n\r' },
      { waitFor: 'Install commitlint', send: 'n\r' },
      { waitFor: 'Install GitHub Actions', send: 'n\r' },
      { waitFor: 'Install shadcn MCP', send: 'n\r' },
    ],
    expectOutput: [
      'Package manager',
      'Install Vitest + React Testing Library?',
      // Every prompt resolveCreateOptions can ask needs an answer scripted
      // above, or the run blocks until the harness times out. Asserting the
      // text here makes a missing answer fail as a mismatch rather than as an
      // unexplained 120s timeout.
      'Install GitHub Actions workflows?',
      'Install shadcn MCP for Claude, Codex, and OpenCode?',
    ],
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
    execution: { requires: ['npm'] },
    args: [],
    interactions: [
      { waitFor: 'Framework', send: '\r' },
      { waitFor: 'Package manager', send: '\r' },
      { waitFor: 'Install Vitest', send: '\r' },
      { waitFor: 'Install Playwright', send: '\r' },
      { waitFor: 'Install commitlint', send: '\r' },
      { waitFor: 'Install GitHub Actions', send: '\r' },
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

/**
 * Machine-readable scenario metadata for CI matrix generation. Defaults that
 * are implicit in the scenario definitions (framework, package manager) are
 * made explicit so workflows can key setup steps off them.
 */
export function scenarioMetadata(scenarios = cliE2eScenarios) {
  return scenarios.map((scenario) => ({
    name: scenario.name,
    kind: scenario.kind,
    framework: scenario.framework ?? 'next',
    packageManager: scenario.packageManager ?? 'npm',
    quick: scenario.quick === true,
    heavy: scenario.heavy === true,
    requiresTty: scenario.requiresTty === true,
    execution: {
      requires: scenario.execution?.requires ?? [],
      os: scenario.execution?.os ?? defaultRunners,
    },
  }));
}

/**
 * The CI job matrix: one entry per (real scenario, runner) pair.
 *
 * Expanded here rather than in the workflow so the fan-out stays unit-testable
 * and workflow files keep containing no scenario knowledge at all. Dry-run
 * scenarios are excluded because ci.yml's e2e-quick job already covers them on
 * both Ubuntu and Windows.
 */
export function scenarioMatrix(scenarios = cliE2eScenarios) {
  return scenarioMetadata(scenarios)
    .filter((scenario) => scenario.kind !== 'dry-run')
    .flatMap((scenario) =>
      scenario.execution.os.map((os) => ({
        ...scenario,
        os,
        // Job names must be unique per runner or the matrix collapses them in
        // the checks UI.
        jobName: `${scenario.name} (${os})`,
      }))
    );
}
