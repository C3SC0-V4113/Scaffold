import path from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { writeFeatureFiles } from '../src/features/registry.js';
import { DryRunExecutor } from '../src/executor.js';
import { viteAdapter } from '../src/frameworks/vite/index.js';
import { resolveServerAdapter, validateFrameworkOptions } from '../src/frameworks/validate.js';
import {
  createViteApp,
  addVitePathAliases,
  addViteTypecheckCoverage,
} from '../src/installers/vite.js';
import { initializeShadcn } from '../src/installers/shadcn.js';
import { pinnedSpecifier } from '../src/installers/config-model.js';
import { renderViteHomePage } from '../src/templates/files.js';
import { renderAgents, renderDesignDoc, renderReadme } from '../src/templates/files.js';
import type { CreateOptions } from '../src/types.js';

const options: CreateOptions = {
  targetDir: 'vite-test-app',
  framework: 'vite',
  router: 'react-router-data',
  packageManager: 'npm',
  ssr: false,
  unit: true,
  e2e: true,
  commitlint: false,
  ci: false,
  motion: false,
  query: false,
  yes: true,
  dryRun: true,
  skipInstall: false,
  shadcnArgs: [],
  mcp: false,
};

describe('Vite adapter', () => {
  it('declares Vite layout, capabilities, and configuration variants', () => {
    expect(viteAdapter.capabilities).toEqual({
      packageManagers: ['npm', 'pnpm', 'bun'],
      routers: ['none', 'react-router-data', 'react-router-declarative'],
      defaultRouter: 'react-router-data',
    });
    expect(viteAdapter.layout).toEqual({
      sourceRoot: 'src/',
      globalStylesheet: 'src/index.css',
      utilsPath: 'src/lib/utils.ts',
      uiDir: 'src/components/ui',
      importAlias: '@/',
      editHint: 'src/App.tsx',
      eslintConfigPath: 'eslint.config.js',
      vitestConfigPath: 'vitest.config.ts',
    });
    expect(viteAdapter.vitestConfig).toEqual({ kind: 'merge-vite' });
    expect(viteAdapter.layout.eslintConfigPath).toBe('eslint.config.js');
    expect(viteAdapter.layout.vitestConfigPath).toBe('vitest.config.ts');
    expect(viteAdapter.skills(options)).toEqual([]);
  });

  it.each(['npm', 'pnpm', 'bun'] as const)(
    'uses the %s create-vite and install commands in a dry run',
    async (packageManager) => {
      const executor = new DryRunExecutor();
      await createViteApp({ ...options, packageManager }, executor);

      expect(executor.operations[0]).toContain(
        `run ${packageManager === 'npm' ? 'npm' : packageManager} create vite@latest vite-test-app`,
      );
      expect(executor.operations[0]).toContain('--template react-ts');
      expect(executor.operations[0]).toContain('--no-interactive --no-immediate');
      const installOperation = executor.operations.find((operation) =>
        operation.includes(pinnedSpecifier('vite', 'vite')),
      );
      expect(installOperation).toContain(
        pinnedSpecifier('vite', 'vite'),
      );
      expect(installOperation).toContain(
        pinnedSpecifier('@tailwindcss/vite', 'vite'),
      );
      const installIndex = executor.operations.findIndex((operation) =>
        operation === installOperation,
      );
      if (packageManager === 'pnpm') {
        const workspaceIndex = executor.operations.indexOf(
          `write ${path.resolve('vite-test-app', 'pnpm-workspace.yaml')}`,
        );
        expect(workspaceIndex).toBeGreaterThan(0);
        expect(workspaceIndex).toBeLessThan(installIndex);
        expect(executor.operations[installIndex]).not.toContain('--allow-build=');
      }
      expect(executor.operations).toContain(
        `write ${path.resolve('vite-test-app', 'tsconfig.app.json')}`,
      );
      expect(executor.operations).toContain(
        `write ${path.resolve('vite-test-app', 'tsconfig.json')}`,
      );
      expect(executor.operations).toContain(
        `write ${path.resolve('vite-test-app', 'tsconfig.node.json')}`,
      );
      expect(executor.operations).toContain(
        `write ${path.resolve('vite-test-app', 'vite.config.ts')}`,
      );
    },
  );

  it('runs create-vite from the target parent when given an absolute target', async () => {
    const targetDir = path.resolve(tmpdir(), 'purrfold-vite-target');
    const executor = new DryRunExecutor();
    await createViteApp({ ...options, targetDir }, executor);

    expect(executor.operations[0]).toContain('create vite@latest purrfold-vite-target');
    expect(executor.operations[0]).toContain(`(cwd ${path.dirname(targetDir)})`);
  });

  it('keeps interactive preset selection and forwards a user preset once', async () => {
    const interactiveExecutor = new DryRunExecutor();
    await initializeShadcn(
      path.join(tmpdir(), 'vite-interactive'),
      { ...options, yes: false, shadcnArgs: [] },
      interactiveExecutor,
    );
    expect(interactiveExecutor.operations[0]).not.toContain('--preset');

    const presetExecutor = new DryRunExecutor();
    await initializeShadcn(
      path.join(tmpdir(), 'vite-preset'),
      { ...options, shadcnArgs: ['--preset', 'user-preset'] },
      presetExecutor,
    );
    expect(presetExecutor.operations[0].match(/--preset/g)).toHaveLength(1);
    expect(presetExecutor.operations[0]).toContain('--preset user-preset');
  });

  it('adds the shadcn alias to create-vite JSONC without dropping comments', () => {
    const current = `{
  "compilerOptions": {
    /* bundler mode */
    "moduleResolution": "bundler"
  }
}`;

    const rewritten = addVitePathAliases(current);
    expect(rewritten).toContain('/* bundler mode */');
    expect(rewritten).toContain('"@/*": ["./src/*"]');
    expect(addVitePathAliases('{\n  "files": []\n}')).toContain(
      '"@/*": ["./src/*"]',
    );
    expect(() => addVitePathAliases('not json')).toThrowError(
      'Expected a create-vite TypeScript config to be a JSON object.',
    );
  });

  it('includes generated tests and tool configs in the TypeScript projects', () => {
    const configs = addViteTypecheckCoverage(
      '{ "include": ["src"] }',
      '{ "include": ["vite.config.ts"] }',
      { unit: true, e2e: true },
    );

    expect(configs.app).toContain('"include": ["src", "tests"]');
    expect(configs.node).toContain(
      '"include": ["vite.config.ts","vitest.config.ts","playwright.config.ts"]',
    );
  });

  it('rejects SSR flags with the current data-derived message', () => {
    expect(() =>
      validateFrameworkOptions(viteAdapter, 'npm', { ssr: true }),
    ).toThrowError(
      new Error(
        '--ssr and --adapter are only available when --framework astro or react-router is selected.',
      ),
    );
    expect(() => resolveServerAdapter(viteAdapter, 'node')).toThrowError(
      'Unsupported Vite adapter "node". Use .',
    );
  });

  it('snapshots the generated Vite quality configs', () => {
    expect(viteAdapter.templates.eslint(options)).toMatchSnapshot('eslint');
    expect(viteAdapter.templates.prettier(options)).toMatchSnapshot('prettier');
    expect(viteAdapter.templates.vitest(options)).toMatchSnapshot('vitest');
    expect(viteAdapter.templates.doctorConfig(options)).toMatchSnapshot('doctor');
  });

  it('snapshots Vite docs and uses the Vite command and stylesheet paths', () => {
    expect(renderReadme(options, viteAdapter.docs)).toMatchSnapshot('readme');
    expect(renderAgents(options, viteAdapter.docs)).toMatchSnapshot('agents');
    expect(renderDesignDoc(viteAdapter.layout)).toMatchSnapshot('design');
  });

  it('renders the Vite starter with the selected cat icon and Motion wrapper', async () => {
    const page = renderViteHomePage('my-vite-app', 'lucide', true);
    const executor = new DryRunExecutor();

    expect(page).toContain("import { Cat } from 'lucide-react';");
    expect(page).toContain("import { MotionMain } from '@/components/common/motion-main';");
    expect(page).toContain('<h1 className="text-2xl font-semibold tracking-tight">My Vite App</h1>');
    expect(viteAdapter.templates.unitSmokeTest(options)).toContain("import { routes } from '@/router';");
    const projectRoot = path.join(tmpdir(), 'my-vite-app');
    const motionOptions = { ...options, motion: true };
    await viteAdapter.writeAppShell(projectRoot, executor, 'lucide', motionOptions);
    await writeFeatureFiles({
      adapter: viteAdapter,
      options: motionOptions,
      executor,
      projectRoot,
      stage: 'app-shell',
    });
    expect(
      executor.operations.filter((operation) => operation === `write ${path.join(projectRoot, 'src', 'App.tsx')}`),
    ).toHaveLength(1);
    expect(executor.operations).toContain(`remove ${path.join(projectRoot, 'src', 'App.css')}`);
    expect(executor.operations).toContain(`remove ${path.join(projectRoot, 'src', 'assets', 'react.svg')}`);
    expect(executor.operations).toContain(`remove ${path.join(projectRoot, 'public', 'vite.svg')}`);
    expect(executor.operations).toContain(`write ${path.join(projectRoot, 'src', 'components', 'common', 'motion-main.tsx')}`);
    expect(executor.operations).toContain(`write ${path.join(projectRoot, 'index.html')}`);
  });
});
