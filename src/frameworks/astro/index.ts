import path from 'node:path';

import { createAstroApp } from '../../installers/astro.js';
import {
  ASTRO_DEPENDENCY_VERSION_OVERRIDES,
  buildScripts,
  FRAMEWORK_DEVELOPMENT_DEPENDENCIES,
  FRAMEWORK_PACKAGE_SCRIPT_CONFIG,
} from '../../installers/config-model.js';
import {
  readProjectPackageJson,
  writeProjectPackageJson,
} from '../../installers/package-json.js';
import { renderAstroEslintConfig } from '../../templates/eslint.js';
import {
  renderAstroHomeHero,
  renderAstroHomePage,
  renderAstroRootLayout,
  renderAstroUnitSmokeTest,
  renderPrettierConfig,
  renderReactDoctorConfig,
  renderVitestConfig,
} from '../../templates/files.js';
import { motionMainComponent } from '../../templates/files.js';
import type { CreateOptions, Executor, IconLibrary } from '../../types.js';
import type { FrameworkAdapter } from '../types.js';

// The starter's confetti hero is replaced, so these dependencies have no
// runtime package or usage left in the generated src/ tree.
const astroStarterDependencies = [
  '@astrojs/mdx',
  'canvas-confetti',
  '@types/canvas-confetti',
];

export const astroAdapter: FrameworkAdapter = {
  id: 'astro',
  label: 'Astro',
  description: 'React-enabled Astro scaffold for shadcn-compatible projects.',
  capabilities: {
    packageManagers: ['npm', 'pnpm'],
    rendering: {
      ssr: true,
      adapters: ['node', 'vercel', 'netlify', 'cloudflare'],
      defaultAdapter: 'cloudflare',
    },
    routers: [],
  },
  layout: {
    sourceRoot: 'src/',
    globalStylesheet: 'src/styles/global.css',
    utilsPath: 'src/lib/utils.ts',
    uiDir: 'src/components/ui',
    motionMainPath: 'src/components/common/motion-main.tsx',
  },
  dependencyOverrides: ASTRO_DEPENDENCY_VERSION_OVERRIDES,
  developmentDependencies: FRAMEWORK_DEVELOPMENT_DEPENDENCIES.astro,
  packageScriptConfig: FRAMEWORK_PACKAGE_SCRIPT_CONFIG.astro,
  playwrightServer: { hostFlag: '--hostname', port: 3000 },
  eslintConfigFile: 'eslint.config.mjs',
  prettierConfig: {
    tailwindStylesheet: 'src/styles/global.css',
    extraPlugins: ['prettier-plugin-astro'],
  },
  vitestConfig: {
    kind: 'standalone',
    tsconfigPaths: 'native',
  },
  scaffold: createAstroApp,
  shadcnInitArgs: () => ['-t', 'astro'],
  async cleanupStarter(
    projectRoot: string,
    _options: CreateOptions,
    executor: Executor,
  ) {
    const packageJson = await readProjectPackageJson(projectRoot, executor);
    const dependencies = { ...(packageJson.dependencies ?? {}) };
    let changed = false;
    for (const dependency of astroStarterDependencies) {
      if (dependency in dependencies) {
        delete dependencies[dependency];
        changed = true;
      }
    }
    if (changed) {
      packageJson.dependencies = dependencies;
      await writeProjectPackageJson(projectRoot, executor, packageJson);
    }
  },
  async writeAppShell(
    projectRoot: string,
    executor: Executor,
    iconLibrary: IconLibrary,
    motion: boolean,
  ) {
    const name = path.basename(projectRoot);
    if (motion) {
      await executor.writeFile(
        path.join(projectRoot, astroAdapter.layout.motionMainPath),
        motionMainComponent,
      );
    }
    await executor.remove(
      path.join(projectRoot, 'src/components/Button.astro'),
    );
    await executor.writeFile(
      path.join(projectRoot, 'src/components/home-hero.tsx'),
      renderAstroHomeHero(name, iconLibrary, motion),
    );
    await executor.writeFile(
      path.join(projectRoot, 'src/pages/index.astro'),
      renderAstroHomePage(name, motion),
    );
    await executor.writeFile(
      path.join(projectRoot, 'src/layouts/main.astro'),
      renderAstroRootLayout(),
    );
  },
  templates: {
    eslint: (o) =>
      renderAstroEslintConfig({ ...o, registerImportPlugin: true }),
    prettier: () => renderPrettierConfig(astroAdapter.prettierConfig),
    vitest: () => renderVitestConfig(astroAdapter.vitestConfig),
    unitSmokeTest: () => renderAstroUnitSmokeTest(),
    doctorConfig: (o) =>
      renderReactDoctorConfig(
        astroAdapter.layout,
        o.motion,
        astroAdapter.docs.doctorIgnoreMotionRule,
      ),
  },
  packageScripts: (o) => buildScripts(o, astroAdapter.packageScriptConfig),
  skills: () => ['astro'],
  docs: {
    mergeStrategy: 'merge',
    frameworkName: 'Astro',
    readmeTitle: 'Astro Quality App',
    toolingLines: [
      '- Astro project with TypeScript, Tailwind, and React islands.',
      '- shadcn UI initialized through the shadcn CLI.',
      '- ESLint flat config with strict Astro, React, import ordering, and Prettier integration.',
      '- `@shadcn/lint` enforcing the design system rules in `DESIGN.md`.',
      '- React Doctor and React Scan.',
    ],
    motionGuidance:
      'Astro/Vite requires no additional Motion configuration. Use Motion inside React islands.',
    motionAgentGuidance:
      '- Astro/Vite requires no additional Motion configuration; animate within React islands.',
    doctorIgnoreMotionRule: false,
    agentsRules: `<!-- BEGIN:astro-agent-rules -->\n\n# This is an Astro scaffold\n\nThis project uses Astro. Read the current Astro docs before changing framework APIs or project structure.\n\n<!-- END:astro-agent-rules -->`,
  },
};
