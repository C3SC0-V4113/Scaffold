import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DryRunExecutor } from '../src/executor.js';
import { getFrameworkAdapter } from '../src/frameworks/registry.js';
import { pinnedSpecifier } from '../src/installers/config-model.js';
import { queryFeature } from '../src/features/query/index.js';
import { patchViteQueryRouter, queryFeatureFiles, queryPaths, querySourcePatches } from '../src/features/query/files.js';
import { writeFeatureFiles } from '../src/features/registry.js';
import type { CreateOptions, Executor, Framework } from '../src/types.js';

class RecordingExecutor implements Executor {
  readonly runs: Array<{ command: string; args: string[]; cwd?: string }> = [];
  readonly files = new Map<string, string>();
  constructor(initial: Record<string, string> = {}) { this.files = new Map(Object.entries(initial)); }
  async run(command: string, args: string[], options?: { cwd?: string }) { this.runs.push({ command, args, cwd: options?.cwd }); }
  async capture() { return undefined; }
  async ensureDir() {}
  async pathExists(file: string) { return this.files.has(file); }
  async readFile(file: string) { return this.files.get(file) ?? ''; }
  async writeFile(file: string, content: string) { this.files.set(file, content); }
  async writeJson() {}
  async remove() {}
  async symlinkOrJunction() {}
}

function options(overrides: Partial<CreateOptions> = {}): CreateOptions {
  return {
    targetDir: 'my-app', framework: 'next', router: 'none', packageManager: 'npm',
    ssr: false, unit: true, e2e: false, commitlint: false, ci: false, motion: false,
    query: true, yes: true, dryRun: false, skipInstall: false, shadcnArgs: [], mcp: false,
    ...overrides,
  };
}

describe('TanStack Query feature files', () => {
  it.each([
    ['next', 'components/providers/query-provider.tsx', "'use client'", 'useState(() => new QueryClient())'],
    ['astro', 'src/lib/query-provider.tsx', "'use client'", "from './query-client'"],
    ['vite', 'src/lib/query-provider.tsx', "'use client'", 'import.meta.env.DEV'],
    ['react-router', 'app/lib/query-provider.tsx', "'use client'", 'useState(() => new QueryClient())'],
  ] as const)('generates target provider for %s', (framework, providerPath, ...needles) => {
    const files = queryFeatureFiles({
      adapter: getFrameworkAdapter(framework), options: options({ framework }), projectRoot: 'project', stage: 'app-shell',
    });
    const provider = files.find((file) => file.path === path.join('project', providerPath));
    expect(provider).toBeDefined();
    for (const needle of needles) expect(provider?.content).toContain(needle);
    expect(provider?.content).toContain('<ReactQueryDevtools');
  });

  it.each([
    ['next', 'components/providers/query-provider.tsx'],
    ['astro', 'src/lib/query-provider.tsx'],
    ['vite', 'src/lib/query-provider.tsx'],
    ['react-router', 'app/lib/query-provider.tsx'],
  ] as const)('adds only the generated unit test for %s when unit testing is enabled', (framework, provider) => {
    const files = queryFeatureFiles({
      adapter: getFrameworkAdapter(framework), options: options({ framework, unit: true }), projectRoot: 'project', stage: 'unit-tests',
    });
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe(path.join('project', 'tests', 'unit', 'query-provider.test.tsx'));
    const importPath = framework === 'next' ? '@/components/providers/query-provider'
      : framework === 'react-router' ? '~/lib/query-provider' : '@/lib/query-provider';
    expect(files[0].content).toContain(`import { QueryProvider } from '${importPath}'`);
    expect(provider).toBeTruthy();
    expect(queryFeatureFiles({
      adapter: getFrameworkAdapter(framework), options: options({ framework, unit: false }), projectRoot: 'project', stage: 'unit-tests',
    })).toEqual([]);
  });

  it('writes Vite home query files only for the data router', () => {
    const files = queryFeatureFiles({
      adapter: getFrameworkAdapter('vite'), options: options({ framework: 'vite', router: 'react-router-data' }), projectRoot: 'project', stage: 'app-shell',
    });
    expect(files.some((file) => file.path === path.join('project', 'src', 'queries', 'home.ts'))).toBe(true);
    expect(files.find((file) => file.path.endsWith(path.join('queries', 'home.ts')))?.content).toContain("queryKey: ['home']");
    expect(queryPaths.vite.router).toBe('src/router.tsx');
  });

  it('waits for the data-router loader in its generated home smoke test', () => {
    const files = queryFeatureFiles({
      adapter: getFrameworkAdapter('vite'),
      options: options({ framework: 'vite', router: 'react-router-data', unit: true }),
      projectRoot: 'project',
      stage: 'unit-tests',
    });
    const homeTest = files.find((file) => file.path === path.join('project', 'tests', 'unit', 'home.test.tsx'));
    expect(homeTest?.content).toContain('async () =>');
    expect(homeTest?.content).toContain("await screen.findByRole('heading'");
  });

  it.each(['next', 'astro', 'vite', 'react-router'] as const)(
    'records generated paths with DryRunExecutor for %s', async (framework) => {
      const executor = new DryRunExecutor();
      await writeFeatureFiles({
        adapter: getFrameworkAdapter(framework),
        options: options({ framework, router: framework === 'vite' ? 'react-router-data' : 'none' }),
        projectRoot: 'project',
        stage: 'app-shell',
        executor,
      });
      expect(executor.operations).toContain(`write ${path.join('project', queryPaths[framework].provider)}`);
      await writeFeatureFiles({
        adapter: getFrameworkAdapter(framework),
        options: options({ framework, unit: true }),
        projectRoot: 'project',
        stage: 'unit-tests',
        executor,
      });
      expect(executor.operations).toContain(`write ${path.join('project', 'tests', 'unit', 'query-provider.test.tsx')}`);
    },
  );
});

describe('TanStack Query installer', () => {
  function baseFiles(framework: Framework, router: string = 'none') {
    if (framework === 'astro') return {};
    if (framework === 'next') return { [path.join('my-app', 'app/layout.tsx')]: '<body><div>app</div></body>' };
    if (framework === 'react-router') return { [path.join('my-app', 'app/root.tsx')]: '<Outlet />' };
    return router === 'react-router-data'
      ? {
          [path.join('my-app', 'src/main.tsx')]: '<StrictMode><App /></StrictMode>',
          [path.join('my-app', 'src/router.tsx')]: '{ index: true, element: <App /> },',
        }
      : { [path.join('my-app', 'src/main.tsx')]: '<StrictMode><App /></StrictMode>' };
  }
  it.each([
    ['npm', 'npm', ['install', '--legacy-peer-deps', pinnedSpecifier('@tanstack/react-query'), pinnedSpecifier('@tanstack/react-query-devtools')], ['install', '--legacy-peer-deps', '--save-dev', pinnedSpecifier('@tanstack/eslint-plugin-query')]],
    ['pnpm', 'pnpm', ['add', pinnedSpecifier('@tanstack/react-query'), pinnedSpecifier('@tanstack/react-query-devtools')], ['add', '-D', pinnedSpecifier('@tanstack/eslint-plugin-query')]],
    ['bun', 'bun', ['add', pinnedSpecifier('@tanstack/react-query'), pinnedSpecifier('@tanstack/react-query-devtools')], ['add', '-d', pinnedSpecifier('@tanstack/eslint-plugin-query')]],
  ] as const)('uses versions.json pins with %s', async (packageManager, command, runtime, development) => {
    const executor = new RecordingExecutor(baseFiles('next'));
    await queryFeature.install({ adapter: getFrameworkAdapter('next'), options: options({ packageManager }), executor, projectRoot: 'my-app' });
    expect(executor.runs).toEqual([
      { command, args: [...runtime], cwd: 'my-app' },
      { command, args: [...development], cwd: 'my-app' },
    ]);
  });

  it('does not install packages with --skip-install', async () => {
    const executor = new RecordingExecutor(baseFiles('next'));
    await queryFeature.install({ adapter: getFrameworkAdapter('next'), options: options({ skipInstall: true }), executor, projectRoot: 'my-app' });
    expect(executor.runs).toEqual([]);
  });

  it('patches only existing target entry points and uses the expected provider wiring', async () => {
    const cases: Array<{ framework: Framework; file: string; source: string; includes: string; router?: string }> = [
      { framework: 'next', file: 'app/layout.tsx', source: '<body><div>app</div></body>', includes: '<QueryProvider>' },
      { framework: 'vite', file: 'src/main.tsx', source: '<StrictMode><App /></StrictMode>', includes: '<QueryProvider>' },
      { framework: 'react-router', file: 'app/root.tsx', source: '<Outlet />', includes: '<QueryProvider><Outlet /></QueryProvider>' },
      { framework: 'vite', file: 'src/router.tsx', source: '{ index: true, element: <App /> },', includes: 'ensureQueryData', router: 'react-router-data' },
    ];
    for (const item of cases) {
      const file = path.join('my-app', item.file);
      const executor = new RecordingExecutor({
        ...(item.framework === 'vite' ? { [path.join('my-app', 'src/main.tsx')]: '<StrictMode><App /></StrictMode>' } : {}),
        [file]: item.source,
      });
      const selected = options({ framework: item.framework, router: item.router === 'react-router-data' ? 'react-router-data' : 'none', skipInstall: true });
      await queryFeature.install({ adapter: getFrameworkAdapter(item.framework), options: selected, executor, projectRoot: 'my-app' });
      expect(executor.files.get(file)).toContain(item.includes);
    }
  });

  it('keeps Astro pages untouched and provider patchers reject unknown layouts', () => {
    expect(querySourcePatches.astro).toBeUndefined();
    expect(() => patchViteQueryRouter('<Routes />')).toThrow('Could not find the Vite data router home route');
    const viteMain = querySourcePatches.vite?.(`import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);`);
    expect(viteMain?.indexOf("from './App.tsx'")).toBeLessThan(viteMain?.indexOf("from './lib/query-provider'"));
  });

  it.each(['next', 'astro', 'vite', 'react-router'] as const)(
    'contributes query lint rules without changing the disabled config for %s',
    (framework) => {
      const adapter = getFrameworkAdapter(framework);
      const disabled = adapter.templates.eslint(options({ framework, query: false }));
      const enabled = adapter.templates.eslint(options({ framework, query: true }));
      expect(disabled).not.toContain('@tanstack/eslint-plugin-query');
      expect(enabled).toContain("import queryPlugin from '@tanstack/eslint-plugin-query';");
      expect(enabled).toContain("...queryPlugin.configs['flat/recommended']");
      expect(enabled).toContain("reactDoctor.configs['tanstack-query']");
      expect(enabled).toContain("'react-doctor/query-no-rest-destructuring': 'off'");
      expect(enabled.indexOf("from '@shadcn/lint'")).toBeLessThan(enabled.indexOf("from '@tanstack/eslint-plugin-query'"));
    },
  );

  it('records integration writes during dry runs without reading scaffold files', async () => {
    const executor = new DryRunExecutor();
    await queryFeature.install({ adapter: getFrameworkAdapter('next'), options: options({ skipInstall: true }), executor, projectRoot: 'my-app' });
    expect(executor.operations.some((operation) => operation.includes(path.join('my-app', 'app', 'layout.tsx')))).toBe(true);
  });
});
