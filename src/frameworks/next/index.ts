import path from 'node:path';

import { createNextApp } from '../../installers/next.js';
import {
  buildScripts,
  FRAMEWORK_DEVELOPMENT_DEPENDENCIES,
  FRAMEWORK_PACKAGE_SCRIPT_CONFIG,
} from '../../installers/config-model.js';
import { renderNextEslintConfig } from '../../templates/eslint.js';
import {
  renderPrettierConfig,
  renderReactDoctorConfig,
  renderRootLayout,
  renderHomePage,
  renderVitestConfig,
  unitSmokeTest,
} from '../../templates/files.js';
import type { CreateOptions, Executor, IconLibrary } from '../../types.js';
import type { FrameworkAdapter } from '../types.js';

export const nextAdapter: FrameworkAdapter = {
  id: 'next',
  label: 'Next.js',
  description: 'Default framework with the current purrfold workflow.',
  capabilities: {
    packageManagers: ['npm', 'pnpm', 'bun'],
    routers: [],
  },
  layout: {
    sourceRoot: '',
    globalStylesheet: 'app/globals.css',
    utilsPath: 'lib/utils.ts',
    uiDir: 'components/ui',
    importAlias: '@/',
    editHint: 'app/page.tsx',
    eslintConfigPath: 'eslint.config.mjs',
    vitestConfigPath: 'vitest.config.mts',
  },
  dependencyOverrides: {},
  developmentDependencies: FRAMEWORK_DEVELOPMENT_DEPENDENCIES.next,
  packageScriptConfig: FRAMEWORK_PACKAGE_SCRIPT_CONFIG.next,
  playwrightServer: { hostFlag: '--hostname', port: 3000 },
  prettierConfig: {
    tailwindStylesheet: 'app/globals.css',
    extraPlugins: [],
  },
  vitestConfig: {
    kind: 'standalone',
    tsconfigPaths: 'plugin',
  },
  scaffold: createNextApp,
  shadcnInitArgs: () => [],
  async writeAppShell(
    projectRoot: string,
    executor: Executor,
    iconLibrary: IconLibrary,
    options,
    writeFeatureFiles,
  ) {
    const name = path.basename(projectRoot);
    await writeFeatureFiles();
    await executor.writeFile(
      path.join(projectRoot, 'app/layout.tsx'),
      renderRootLayout(name),
    );
    await executor.writeFile(
      path.join(projectRoot, 'app/page.tsx'),
      renderHomePage(name, iconLibrary, options.motion),
    );
  },
  templates: {
    eslint: (o) => renderNextEslintConfig(o),
    prettier: () => renderPrettierConfig(nextAdapter.prettierConfig),
    vitest: () => renderVitestConfig(nextAdapter.vitestConfig),
    unitSmokeTest: () => unitSmokeTest,
    doctorConfig: (o) =>
      renderReactDoctorConfig(
        nextAdapter.layout,
        o,
        nextAdapter,
      ),
  },
  packageScripts: (o) => buildScripts(o, nextAdapter.packageScriptConfig),
  skills: () => [
    'next-cache-components-adoption',
    'next-cache-components-optimizer',
    'next-dev-loop',
  ],
  docs: {
    agentsTemplate: 'next',
    mergeStrategy: 'replace',
    frameworkName: 'Next.js',
    promptLabel: 'Next.js',
    frameworkGuidance: 'This project uses Next.js with React and TypeScript. Read the current Next.js and React docs before changing framework APIs or project structure.',
    referenceDocsUrl: 'https://nextjs.org/docs',
    readmeTitle: 'Next Quality App',
    toolingLines: [
      '- Next.js App Router with TypeScript and Tailwind.',
      '- shadcn UI initialized through the shadcn CLI.',
      '- ESLint flat config with strict Next.js, React, import ordering, and Prettier integration.',
      '- `@shadcn/lint` enforcing the design system rules in `DESIGN.md`.',
      '- React Doctor and React Scan.',
    ],
    agentsRules: `<!-- BEGIN:nextjs-agent-rules -->\n\n# This is NOT the Next.js you know\n\nThis project uses Next.js 16 or newer. APIs and conventions may differ from model memory. Read relevant guides in \`node_modules/next/dist/docs/\` before changing Next.js code.\n\n<!-- END:nextjs-agent-rules -->`,
  },
};
