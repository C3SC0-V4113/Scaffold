import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pinnedSpecifier } from '../src/installers/config-model.js';

type CliE2eScenario = {
  name: string;
  kind: 'real' | 'dry-run' | 'interactive' | 'external-shadcn';
  framework?: 'next' | 'astro';
  packageManager?: 'npm' | 'pnpm' | 'bun';
  ssrAdapter?: 'node' | 'vercel' | 'netlify' | 'cloudflare';
  args?: string[];
  quick?: boolean;
  requires?: string[];
  requiresTty?: boolean;
  expect?: {
    unit: boolean;
    e2e: boolean;
    commitlint: boolean;
    pnpm: boolean;
    mcp: boolean;
    motion?: boolean;
  };
  expectOutput?: string[];
  rejectOutput?: string[];
  interactions?: Array<{ waitFor: string; send: string; optional?: boolean }>;
};

type ScenarioMetadata = {
  name: string;
  kind: CliE2eScenario['kind'];
  framework: 'next' | 'astro';
  packageManager: 'npm' | 'pnpm' | 'bun';
  quick: boolean;
  heavy: boolean;
  requiresTty: boolean;
  execution: { requires: string[]; os: string[] };
};

type ScenarioMatrixEntry = ScenarioMetadata & { os: string; jobName: string };

type ScenariosModule = {
  cliE2eScenarios: CliE2eScenario[];
  scenarioNames: () => string[];
  defaultRunners: string[];
  crossPlatformRunners: string[];
  scenarioMatrix: (scenarios?: CliE2eScenario[]) => ScenarioMatrixEntry[];
  scenarioMetadata: (scenarios?: CliE2eScenario[]) => ScenarioMetadata[];
  selectScenarios: (options?: {
    quick?: boolean;
    heavy?: boolean;
    names?: string[];
    framework?: 'next' | 'astro';
  }) => CliE2eScenario[];
};

async function loadScenarios(): Promise<ScenariosModule> {
  const url = pathToFileURL(path.join(process.cwd(), 'scripts/e2e/scenarios.mjs')).href;
  return (await import(url)) as ScenariosModule;
}

describe('CLI E2E scenario definitions', () => {
  it('keeps scenario names unique and selectable', async () => {
    const { scenarioNames, selectScenarios } = await loadScenarios();
    const names = scenarioNames();

    expect(new Set(names).size).toBe(names.length);
    expect(selectScenarios({ names: ['npm-default-unit'] }).map((scenario) => scenario.name)).toEqual([
      'npm-default-unit',
    ]);
  });

  it('runs every real scenario on Ubuntu and defaults to Ubuntu only', async () => {
    const { scenarioMatrix, scenarioMetadata, cliE2eScenarios, defaultRunners } = await loadScenarios();
    const matrix = scenarioMatrix();
    const realScenarios = scenarioMetadata(cliE2eScenarios).filter((scenario) => scenario.kind !== 'dry-run');

    expect(defaultRunners).toEqual(['ubuntu-latest']);
    for (const scenario of realScenarios) {
      expect(matrix.some((entry) => entry.name === scenario.name && entry.os === 'ubuntu-latest')).toBe(true);
    }

    // Dry-run scenarios belong to ci.yml's e2e-quick job and must never inflate
    // the real-generation matrix.
    expect(matrix.some((entry) => entry.kind === 'dry-run')).toBe(false);
  });

  it('fans representative scenarios out to Windows and macOS', async () => {
    const { scenarioMatrix, crossPlatformRunners } = await loadScenarios();
    const matrix = scenarioMatrix();
    const runnersFor = (name: string) => matrix.filter((entry) => entry.name === name).map((entry) => entry.os);

    expect(crossPlatformRunners).toEqual(['ubuntu-latest', 'windows-latest', 'macos-latest']);
    expect(runnersFor('npm-default-unit')).toEqual(crossPlatformRunners);
    expect(runnersFor('astro-npm-ssg-unit')).toEqual(crossPlatformRunners);
    expect(runnersFor('pnpm-b3-commitlint')).toEqual(crossPlatformRunners);

    // The set stays small and deliberate. Each member buys coverage the others
    // cannot: Next and Astro generate differently, and the pnpm scenario is the
    // only one that puts createPnpmToolchain — .cmd forwarder, junction, Node
    // hardlink — on a non-Linux runner.
    const crossPlatform = matrix.filter((entry) => entry.os !== 'ubuntu-latest');
    expect(new Set(crossPlatform.map((entry) => entry.name))).toEqual(
      new Set(['npm-default-unit', 'astro-npm-ssg-unit', 'pnpm-b3-commitlint'])
    );
  });

  it('covers both frameworks and both toolchain shapes off Linux', async () => {
    const { scenarioMatrix } = await loadScenarios();
    const crossPlatform = scenarioMatrix().filter((entry) => entry.os !== 'ubuntu-latest');

    // Stated as coverage rather than as a name list, so adding a fourth member
    // has to justify itself against what is already represented.
    expect(new Set(crossPlatform.map((entry) => entry.framework))).toEqual(new Set(['next', 'astro']));
    expect(new Set(crossPlatform.map((entry) => entry.packageManager))).toEqual(new Set(['npm', 'pnpm']));

    // Playwright scenarios stay Linux-only: they would triple a browser download
    // without adding anything the lighter pnpm scenario does not already prove.
    expect(crossPlatform.some((entry) => entry.name.includes('e2e'))).toBe(false);
  });

  it('gives every matrix entry a unique job name so checks do not collapse', async () => {
    const { scenarioMatrix } = await loadScenarios();
    const jobNames = scenarioMatrix().map((entry) => entry.jobName);

    expect(new Set(jobNames).size).toBe(jobNames.length);
    expect(jobNames).toContain('npm-default-unit (windows-latest)');
    expect(jobNames).toContain('astro-npm-ssg-unit (macos-latest)');
  });

  it('covers the planned package-manager and shadcn preset matrix', async () => {
    const { cliE2eScenarios } = await loadScenarios();

    expect(cliE2eScenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'npm-default-unit', packageManager: 'npm' }),
        expect.objectContaining({ name: 'pnpm-b3-commitlint', packageManager: 'pnpm' }),
        expect.objectContaining({ name: 'npm-b1-no-tests', packageManager: 'npm' }),
        expect.objectContaining({ name: 'pnpm-b2-e2e', packageManager: 'pnpm' }),
        expect.objectContaining({ name: 'bun-b5-minimal', packageManager: 'bun' }),
      ])
    );

    const args = cliE2eScenarios.flatMap((scenario) => scenario.args ?? []);
    for (const preset of ['b3REw8vwo', 'b1sSLwZVp', 'b2qMI9ufY', 'b5eH0WVTX', 'b6FS5q9aq']) {
      expect(args).toContain(preset);
    }
  });

  it('covers Astro SSG, generated Playwright files, and SSR adapter generation', async () => {
    const { cliE2eScenarios, selectScenarios } = await loadScenarios();

    expect(cliE2eScenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'astro-npm-ssg-unit',
          framework: 'astro',
          packageManager: 'npm',
        }),
        expect.objectContaining({
          name: 'astro-pnpm-ssg-e2e',
          framework: 'astro',
          packageManager: 'pnpm',
          expect: expect.objectContaining({ e2e: true }),
        }),
        expect.objectContaining({
          name: 'astro-npm-ssr-node',
          framework: 'astro',
          ssrAdapter: 'node',
        }),
      ])
    );

    const realSsrAdapters = cliE2eScenarios
      .filter((scenario) => scenario.kind === 'real' && scenario.framework === 'astro' && scenario.ssrAdapter)
      .map((scenario) => scenario.ssrAdapter);
    expect(new Set(realSsrAdapters)).toEqual(new Set(['node', 'vercel', 'netlify', 'cloudflare']));

    expect(selectScenarios({ framework: 'astro' }).every((scenario) => scenario.framework === 'astro')).toBe(
      true
    );
    expect(selectScenarios({ quick: true, framework: 'astro' }).map((scenario) => scenario.name)).toEqual(
      expect.arrayContaining(['dry-run-astro-ssg-npm', 'dry-run-astro-ssr-cloudflare-pnpm'])
    );
  });

  it('keeps heavy real and TTY scenarios out of the quick E2E subset', async () => {
    const { selectScenarios } = await loadScenarios();
    const quick = selectScenarios({ quick: true });

    expect(quick.length).toBeGreaterThan(0);
    expect(quick.every((scenario) => scenario.kind === 'dry-run')).toBe(true);
    expect(quick.every((scenario) => !scenario.requiresTty)).toBe(true);
  });

  it('excludes extra-heavy scenarios from the default suite but keeps them reachable', async () => {
    const { selectScenarios } = await loadScenarios();

    const defaultNames = selectScenarios().map((scenario) => scenario.name);
    expect(defaultNames).not.toContain('external-shadcn-interactive');
    expect(defaultNames.length).toBeGreaterThan(0);

    const heavyNames = selectScenarios({ heavy: true }).map((scenario) => scenario.name);
    expect(heavyNames).toContain('external-shadcn-interactive');
    expect(heavyNames.every((name) => !defaultNames.includes(name))).toBe(true);

    const byName = selectScenarios({ names: ['external-shadcn-interactive'] }).map(
      (scenario) => scenario.name
    );
    expect(byName).toEqual(['external-shadcn-interactive']);
  });

  it('documents MCP dry-run commands for every supported client', async () => {
    const { cliE2eScenarios } = await loadScenarios();
    const scenario = cliE2eScenarios.find((item) => item.name === 'dry-run-mcp-preset-pnpm');

    expect(scenario?.expectOutput).toEqual(
      expect.arrayContaining([
        expect.stringContaining('mcp init --client claude'),
        expect.stringContaining('mcp init --client codex'),
        expect.stringContaining('mcp init --client opencode'),
      ])
    );
  });

  it('covers opt-in Motion for real Next and Astro generation', async () => {
    const { cliE2eScenarios } = await loadScenarios();
    const next = cliE2eScenarios.find((item) => item.name === 'npm-default-unit');
    const astro = cliE2eScenarios.find((item) => item.name === 'astro-npm-ssg-unit');
    const defaults = cliE2eScenarios.find((item) => item.name === 'dry-run-defaults');

    expect(next).toMatchObject({ kind: 'real', expect: expect.objectContaining({ motion: true }) });
    expect(next?.args).toContain('--motion');
    expect(astro).toMatchObject({ kind: 'real', expect: expect.objectContaining({ motion: true }) });
    expect(astro?.args).toContain('--motion');
    expect(defaults?.rejectOutput).toEqual(
      expect.arrayContaining([pinnedSpecifier('motion'), 'motion-framer'])
    );
  });

  it('covers the reported npm shadcn preset + MCP command in quick E2E', async () => {
    const { cliE2eScenarios, selectScenarios } = await loadScenarios();
    const scenario = cliE2eScenarios.find((item) => item.name === 'dry-run-reported-b6-mcp-npm');

    expect(selectScenarios({ quick: true }).map((item) => item.name)).toContain(
      'dry-run-reported-b6-mcp-npm'
    );
    expect(scenario).toMatchObject({
      kind: 'dry-run',
      packageManager: 'npm',
      quick: true,
      args: ['--yes', '--dry-run', '--mcp', '--shadcn-args', '--preset', 'b6FS5q9aq'],
    });
    expect(scenario?.expectOutput).toEqual(
      expect.arrayContaining([
        expect.stringContaining('shadcn@latest init --defaults --preset b6FS5q9aq'),
        expect.stringContaining(pinnedSpecifier('@vitejs/plugin-react')),
        expect.stringContaining(pinnedSpecifier('vite-tsconfig-paths')),
        expect.stringContaining('mcp init --client claude'),
      ])
    );
    expect(scenario?.rejectOutput).toEqual(
      expect.arrayContaining(['@vitejs/plugin-react@6.0.2', 'vite@7.2.7'])
    );
  });

  it('exposes CI-matrix metadata with explicit defaults for every scenario', async () => {
    const { cliE2eScenarios, scenarioMetadata, selectScenarios } = await loadScenarios();
    const metadata = scenarioMetadata();

    expect(metadata).toHaveLength(cliE2eScenarios.length);
    for (const entry of metadata) {
      expect(entry.name).toBeTruthy();
      expect(['next', 'astro']).toContain(entry.framework);
      expect(['npm', 'pnpm', 'bun']).toContain(entry.packageManager);
      expect(typeof entry.quick).toBe('boolean');
      expect(typeof entry.heavy).toBe('boolean');
      expect(typeof entry.requiresTty).toBe('boolean');
    }

    expect(metadata.find((entry) => entry.name === 'bun-b5-minimal')).toMatchObject({
      packageManager: 'bun',
      framework: 'next',
    });
    expect(metadata.find((entry) => entry.name === 'astro-pnpm-ssg-e2e')).toMatchObject({
      packageManager: 'pnpm',
      framework: 'astro',
    });

    const selected = scenarioMetadata(selectScenarios({ quick: true }));
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every((entry) => entry.kind === 'dry-run')).toBe(true);
  });

  it('scripts an answer for every prompt the interactive scenarios reach', async () => {
    const source = readFileSync(new URL('../src/commands/create.ts', import.meta.url), 'utf8');
    // Confirm prompts are the only single-quoted strings in create.ts that end
    // in a question mark; the `select` prompts ("Framework", "Package manager")
    // do not.
    const prompts = [...source.matchAll(/'([^']+\?)'/g)].map((match) => match[1]);

    expect(prompts.length).toBeGreaterThan(0);

    // Only fires on the Astro path, and every interactive scenario takes the
    // Next default at the framework prompt.
    const reachable = prompts.filter((prompt) => prompt !== 'Enable Astro SSR?');

    const { cliE2eScenarios } = await loadScenarios();
    const interactive = cliE2eScenarios.filter((scenario) => scenario.interactions);

    expect(interactive.length).toBeGreaterThan(0);

    for (const scenario of interactive) {
      const scripted = scenario.interactions ?? [];
      for (const prompt of reachable) {
        // An unanswered prompt does not fail loudly — the CLI just blocks on
        // stdin until the harness kills it at 120s, which reads as a hang
        // rather than as "someone added a prompt". Adding `--ci` did exactly
        // that. Matching on a prefix keeps `waitFor` free to stay short.
        const answered = scripted.some((step) => prompt.startsWith(step.waitFor));
        expect(answered, `${scenario.name} has no answer scripted for "${prompt}"`).toBe(true);
      }
    }
  });

  it('marks external interactive prompt coverage as TTY-gated', async () => {
    const { cliE2eScenarios } = await loadScenarios();
    const interactive = cliE2eScenarios.filter((scenario) => scenario.requiresTty);

    expect(interactive.map((scenario) => scenario.name)).toEqual(
      expect.arrayContaining(['interactive-purrfold-prompts', 'external-shadcn-interactive'])
    );
  });
});
