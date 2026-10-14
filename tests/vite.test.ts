import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DryRunExecutor } from '../src/executor.js';
import { viteAdapter } from '../src/frameworks/vite/index.js';
import { resolveServerAdapter, validateFrameworkOptions } from '../src/frameworks/validate.js';
import { createViteApp, addVitePathAliases } from '../src/installers/vite.js';
import { pinnedSpecifier } from '../src/installers/config-model.js';
import { renderViteHomePage } from '../src/templates/files.js';
import { renderAgents, renderDesignDoc, renderReadme } from '../src/templates/files.js';
import type { CreateOptions } from '../src/types.js';

const options: CreateOptions = {
  targetDir: 'vite-test-app',
  framework: 'vite',
  packageManager: 'npm',
  ssr: false,
  unit: true,
  e2e: true,
  commitlint: false,
  ci: false,
  motion: false,
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
      routers: [],
    });
    expect(viteAdapter.layout).toEqual({
      sourceRoot: 'src/',
      globalStylesheet: 'src/index.css',
      utilsPath: 'src/lib/utils.ts',
      uiDir: 'src/components/ui',
      motionMainPath: 'src/components/common/motion-main.tsx',
    });
    expect(viteAdapter.vitestConfig).toEqual({ kind: 'merge-vite' });
    expect(viteAdapter.eslintConfigFile).toBe('eslint.config.js');
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
      expect(executor.operations[1]).toContain(
        pinnedSpecifier('vite', 'vite'),
      );
      expect(executor.operations[1]).toContain(
        pinnedSpecifier('@tailwindcss/vite', 'vite'),
      );
      if (packageManager === 'pnpm') {
        expect(executor.operations[1]).toContain('--allow-build=esbuild');
      }
      expect(executor.operations).toContain(
        `write ${path.resolve('vite-test-app', 'tsconfig.app.json')}`,
      );
      expect(executor.operations).toContain(
        `write ${path.resolve('vite-test-app', 'tsconfig.json')}`,
      );
      expect(executor.operations).toContain(
        `write ${path.resolve('vite-test-app', 'vite.config.ts')}`,
      );
    },
  );

  it('runs create-vite from the target parent when given an absolute target', async () => {
    const targetDir = path.resolve('/tmp/purrfold-vite-target');
    const executor = new DryRunExecutor();
    await createViteApp({ ...options, targetDir }, executor);

    expect(executor.operations[0]).toContain('create vite@latest purrfold-vite-target');
    expect(executor.operations[0]).toContain(`(cwd ${path.dirname(targetDir)})`);
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

  it('rejects SSR flags with the current data-derived message', () => {
    expect(() =>
      validateFrameworkOptions(viteAdapter, 'npm', { ssr: true }),
    ).toThrowError(
      new Error(
        '--ssr and --adapter are only available when --framework astro is selected.',
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
    expect(viteAdapter.templates.unitSmokeTest(options)).toContain("import App from '@/App';");
    await viteAdapter.writeAppShell('/tmp/my-vite-app', executor, 'lucide', true);
    expect(executor.operations).toContain('remove /tmp/my-vite-app/src/App.css');
    expect(executor.operations).toContain('remove /tmp/my-vite-app/src/assets/react.svg');
    expect(executor.operations).toContain('remove /tmp/my-vite-app/public/vite.svg');
    expect(executor.operations).toContain(
      'write /tmp/my-vite-app/src/components/common/motion-main.tsx',
    );
    expect(executor.operations).toContain('write /tmp/my-vite-app/index.html');
  });
});
