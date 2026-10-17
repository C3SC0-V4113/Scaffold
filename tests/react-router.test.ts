import { describe, expect, it } from 'vitest';

import { DryRunExecutor } from '../src/executor.js';
import { reactRouterAdapter } from '../src/frameworks/react-router/index.js';
import {
  createReactRouterApp,
  renderReactRouterConfig,
  renderReactRouterScripts,
} from '../src/installers/react-router.js';
import { getPackageManagerCommands } from '../src/package-manager.js';
import { renderPlaywrightConfig, renderViteHomePage } from '../src/templates/files.js';
import type { CreateOptions } from '../src/types.js';

const options: CreateOptions = {
  targetDir: 'react-router-test-app',
  framework: 'react-router',
  router: 'none',
  packageManager: 'npm',
  ssr: true,
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

describe('React Router framework adapter', () => {
  it('uses the framework template without install, git init, or scaffolded skill', async () => {
    const executor = new DryRunExecutor();
    await createReactRouterApp(options, executor);
    expect(executor.operations.join('\n')).toContain(
      'create-react-router@latest react-router-test-app --template https://github.com/remix-run/react-router-templates/tree/main/default --yes --no-install --no-git-init --no-agent-skills',
    );
  });

  it('declares app paths, SSR defaults, scripts, and the router skill', () => {
    expect(reactRouterAdapter.layout).toMatchObject({
      sourceRoot: 'app/',
      globalStylesheet: 'app/app.css',
      utilsPath: 'app/lib/utils.ts',
      uiDir: 'app/components/ui',
    });
    expect(reactRouterAdapter.capabilities.rendering).toEqual({
      ssr: true,
      defaultSsr: true,
    });
    expect(
      reactRouterAdapter.packageScripts({
        ...options,
        framework: 'react-router',
      }),
    ).toMatchObject({
      typecheck: 'react-router typegen && tsc',
    });
    expect(renderReactRouterScripts(true).start).toBe(
      'react-router-serve ./build/server/index.js',
    );
    expect(renderReactRouterScripts(false).start).toBe('vite preview');
    expect(reactRouterAdapter.skills(options)).toEqual(['react-router']);
  });

  it('generates standalone unit config, route smoke tests, and SSR/SSG browser checks', () => {
    expect(reactRouterAdapter.vitestConfig).toEqual({
      kind: 'standalone',
      tsconfigPaths: 'native',
    });
    expect(
      reactRouterAdapter.templates.vitest({ framework: 'react-router' }),
    ).not.toContain('react-router plugin');
    expect(reactRouterAdapter.templates.unitSmokeTest(options)).toContain(
      "from '~/routes/home'",
    );
    expect(reactRouterAdapter.templates.e2eSmokeTest?.(options)).toContain(
      "page.goto('/unknown-route')",
    );
    expect(renderReactRouterConfig(true)).toContain('ssr: true');
    expect(renderReactRouterConfig(true)).not.toContain('prerender:');
    expect(renderReactRouterConfig(false)).toContain("prerender: ['/']");
    const playwright = renderPlaywrightConfig(
      'npm',
      reactRouterAdapter.playwrightServer,
      { ssr: true },
    );
    expect(playwright).toContain("const baseUrl = 'http://127.0.0.1:5173';");
    expect(playwright).toContain('npm run dev -- --host 127.0.0.1 --port 5173');
    const staticPlaywright = renderPlaywrightConfig(
      'pnpm',
      reactRouterAdapter.playwrightServer,
      { ssr: false, staticBuild: reactRouterAdapter.playwrightServer.staticBuild },
    );
    expect(staticPlaywright).toContain(
      'pnpm run build && pnpm run start --host 127.0.0.1 --port 5173',
    );
    expect(staticPlaywright).not.toContain('PURRFOLD_E2E_SERVER_COMMAND');
  });

  it('snapshots the generated home route, lint config, and SSR/SSG config', () => {
    expect(renderViteHomePage('demo', 'lucide', false, {
      componentName: 'Home',
      defaultExport: true,
      importAlias: '~/',
      editHint: 'app/routes/home.tsx',
    })).toMatchSnapshot('home-route');
    expect(renderReactRouterConfig(true)).toMatchSnapshot('ssr-config');
    expect(renderReactRouterConfig(false)).toMatchSnapshot('ssg-config');
  });

  it('uses the latest create command and forwards no-agent-skills for all managers', () => {
    for (const manager of ['npm', 'pnpm', 'bun'] as const) {
      const command = getPackageManagerCommands(manager).createReactRouterApp('demo');
      expect(command.args).toContain('create-react-router@latest');
      expect(command.args).toContain('--no-agent-skills');
      expect(command.args).toContain('--no-install');
      expect(command.args).toContain('--no-git-init');
    }
  });
});
