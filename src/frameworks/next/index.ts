import path from 'node:path';

import { createNextApp } from '../../installers/next.js';
import { buildScripts, FRAMEWORK_DEVELOPMENT_DEPENDENCIES, FRAMEWORK_PACKAGE_SCRIPT_CONFIG } from '../../installers/config-model.js';
import { renderEslintConfig } from '../../templates/eslint.js';
import { renderPrettierConfig, renderReactDoctorConfig, renderRootLayout, renderHomePage, renderVitestConfig, unitSmokeTest } from '../../templates/files.js';
import type { CreateOptions, Executor, IconLibrary } from '../../types.js';
import { motionMainComponent } from '../../templates/files.js';
import type { FrameworkAdapter } from '../types.js';

export const nextAdapter: FrameworkAdapter = {
  id: 'next', label: 'Next.js', description: 'Default framework with the current purrfold workflow.',
  capabilities: { packageManagers: ['npm', 'pnpm', 'bun'], routers: [] },
  layout: { sourceRoot: '', globalStylesheet: 'app/globals.css', utilsPath: 'lib/utils.ts', uiDir: 'components/ui', motionMainPath: 'components/common/motion-main.tsx' },
  dependencyOverrides: {},
  developmentDependencies: FRAMEWORK_DEVELOPMENT_DEPENDENCIES.next,
  packageScriptConfig: FRAMEWORK_PACKAGE_SCRIPT_CONFIG.next,
  scaffold: createNextApp,
  shadcnInitArgs: () => [],
  async writeAppShell(projectRoot: string, executor: Executor, iconLibrary: IconLibrary, motion: boolean) {
    const name = path.basename(projectRoot);
    if (motion) await executor.writeFile(path.join(projectRoot, this.layout.motionMainPath), motionMainComponent);
    await executor.writeFile(path.join(projectRoot, 'app/layout.tsx'), renderRootLayout(name));
    await executor.writeFile(path.join(projectRoot, 'app/page.tsx'), renderHomePage(name, iconLibrary, motion));
  },
  templates: {
    eslint: (o) => renderEslintConfig(o), prettier: (o) => renderPrettierConfig(o.framework),
    vitest: (o) => renderVitestConfig(o.framework), unitSmokeTest: () => unitSmokeTest,
    appShell: (o) => ({ root: renderRootLayout(path.basename(o.targetDir)), page: renderHomePage(path.basename(o.targetDir), o.icons, o.motion), rootPath: 'app/layout.tsx', pagePath: 'app/page.tsx' }),
    doctorConfig: (o) => renderReactDoctorConfig(o.framework, o.motion),
  },
  packageScripts: (o) => buildScripts(o, nextAdapter.packageScriptConfig), skills: () => ['next-cache-components-adoption', 'next-cache-components-optimizer', 'next-dev-loop'],
  docs: { mergeStrategy: 'replace' },
};
