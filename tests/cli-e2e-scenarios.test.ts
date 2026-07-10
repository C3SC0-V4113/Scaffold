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
};

type ScenarioMetadata = {
  name: string;
  kind: CliE2eScenario['kind'];
  framework: 'next' | 'astro';
  packageManager: 'npm' | 'pnpm' | 'bun';
  quick: boolean;
  heavy: boolean;
  requiresTty: boolean;
};

type ScenariosModule = {
  cliE2eScenarios: CliE2eScenario[];
  scenarioNames: () => string[];
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

  it('marks external interactive prompt coverage as TTY-gated', async () => {
    const { cliE2eScenarios } = await loadScenarios();
    const interactive = cliE2eScenarios.filter((scenario) => scenario.requiresTty);

    expect(interactive.map((scenario) => scenario.name)).toEqual(
      expect.arrayContaining(['interactive-purrfold-prompts', 'external-shadcn-interactive'])
    );
  });
});
