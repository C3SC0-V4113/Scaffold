import path from 'node:path';

import {
  configureReactRouter,
  createReactRouterApp,
} from '../../installers/react-router.js';
import {
  buildScripts,
  FRAMEWORK_DEVELOPMENT_DEPENDENCIES,
  FRAMEWORK_PACKAGE_SCRIPT_CONFIG,
  REACT_ROUTER_DEPENDENCY_VERSION_OVERRIDES,
} from '../../installers/config-model.js';
import { renderViteEslintConfig } from '../../templates/eslint.js';
import {
  renderPrettierConfig,
  renderReactDoctorConfig,
  renderVitestConfig,
  renderViteHomePage,
} from '../../templates/files.js';
import type { CreateOptions, Executor, IconLibrary } from '../../types.js';
import type { FrameworkAdapter } from '../types.js';

export const reactRouterAdapter: FrameworkAdapter = {
  id: 'react-router',
  label: 'React Router (framework mode)',
  description:
    'Full stack React framework with React Router, Tailwind CSS, and shadcn UI.',
  capabilities: {
    packageManagers: ['npm', 'pnpm', 'bun'],
    rendering: { ssr: true, defaultSsr: true },
    routers: [],
  },
  layout: {
    sourceRoot: 'app/',
    globalStylesheet: 'app/app.css',
    utilsPath: 'app/lib/utils.ts',
    uiDir: 'app/components/ui',
    importAlias: '~/',
    editHint: 'app/routes/home.tsx',
    eslintConfigPath: 'eslint.config.js',
    vitestConfigPath: 'vitest.config.ts',
  },
  dependencyOverrides: REACT_ROUTER_DEPENDENCY_VERSION_OVERRIDES,
  developmentDependencies: FRAMEWORK_DEVELOPMENT_DEPENDENCIES['react-router'],
  packageScriptConfig: FRAMEWORK_PACKAGE_SCRIPT_CONFIG['react-router'],
  playwrightServer: {
    hostFlag: '--host',
    port: 5173,
    staticBuild: { buildScript: 'build', startScript: 'start' },
  },
  prettierConfig: { tailwindStylesheet: 'app/app.css', extraPlugins: [] },
  vitestConfig: { kind: 'standalone', tsconfigPaths: 'native' },
  scaffold: async (options, executor) => {
    const root = await createReactRouterApp(options, executor);
    await configureReactRouter(root, options, executor);
    return root;
  },
  shadcnInitArgs: () => ['-t', 'react-router'],
  async writeAppShell(
    projectRoot: string,
    executor: Executor,
    iconLibrary: IconLibrary,
    options: CreateOptions,
  ) {
    const route = renderViteHomePage(path.basename(projectRoot), iconLibrary, options.motion, {
      componentName: 'Home',
      defaultExport: true,
      importAlias: this.layout.importAlias,
      editHint: this.layout.editHint,
    });
    await executor.writeFile(
      path.join(projectRoot, 'app/routes/home.tsx'),
      route,
    );
    await executor.remove(path.join(projectRoot, 'app/welcome'));
    await executor.remove(path.join(projectRoot, 'Dockerfile'));
    await executor.remove(path.join(projectRoot, '.dockerignore'));
    await executor.remove(path.join(projectRoot, 'public/favicon.ico'));
  },
  templates: {
    eslint: (options) =>
      renderViteEslintConfig({
        ...options,
        uiGlob: 'app/components/ui/**',
        extraIgnores: ['.react-router/**'],
        reactRefresh: false,
        reactRouterRules: true,
      }),
    prettier: () => renderPrettierConfig(reactRouterAdapter.prettierConfig),
    vitest: () => renderVitestConfig(reactRouterAdapter.vitestConfig),
    unitSmokeTest:
      () => `import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from '~/routes/home';

describe('Home route smoke test', () => {
  it('renders a heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });
});
`,
    e2eSmokeTest: () => `import { expect, test } from '@playwright/test';

test('renders the home route', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('renders the not found boundary for unknown routes', async ({ page }) => {
  await page.goto('/unknown-route');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});
`,
    doctorConfig: (options) =>
      renderReactDoctorConfig(reactRouterAdapter.layout, options, 'react-router'),
  },
  packageScripts: (options) =>
    buildScripts(options, reactRouterAdapter.packageScriptConfig),
  skills: () => ['react-router'],
  docs: {
    agentsTemplate: 'react-router',
    mergeStrategy: 'replace',
    frameworkName: 'React Router',
    promptLabel: 'React Router',
    frameworkGuidance:
      'This project uses React Router with React and TypeScript. Read the current React Router and React docs before changing framework APIs or project structure.',
    referenceDocsUrl: 'https://reactrouter.com/start/framework/installation',
    readmeTitle: 'React Router Quality App',
    toolingLines: [
      '- React Router framework mode with SSR or static prerendering, TypeScript, and Tailwind CSS.',
      '- shadcn UI initialized through the shadcn CLI.',
      '- ESLint flat config with TypeScript, React Hooks, React Doctor, and React Router rules.',
    ],
    agentsRules: '',
  },
};
