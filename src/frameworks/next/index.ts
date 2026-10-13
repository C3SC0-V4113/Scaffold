import path from 'node:path';

import { createNextApp } from '../../installers/next.js';
import { buildScripts } from '../../installers/config-model.js';
import { renderEslintConfig } from '../../templates/eslint.js';
import { renderPrettierConfig, renderReactDoctorConfig, renderRootLayout, renderHomePage, renderVitestConfig, unitSmokeTest } from '../../templates/files.js';
import type { CreateOptions } from '../../types.js';
import type { FrameworkAdapter } from '../types.js';

export const nextAdapter: FrameworkAdapter = {
  id: 'next', label: 'Next.js', description: 'Default framework with the current purrfold workflow.',
  capabilities: { packageManagers: ['npm', 'pnpm', 'bun'], routers: [] },
  layout: { sourceRoot: '', globalStylesheet: 'app/globals.css', utilsPath: 'lib/utils.ts', uiDir: 'components/ui', motionMainPath: 'components/common/motion-main.tsx' },
  scaffold: createNextApp,
  shadcnInitArgs: () => [],
  templates: {
    eslint: (o) => renderEslintConfig(o), prettier: (o) => renderPrettierConfig(o.framework),
    vitest: (o) => renderVitestConfig(o.framework), unitSmokeTest: () => unitSmokeTest,
    appShell: (o) => ({ root: renderRootLayout(path.basename(o.targetDir)), page: renderHomePage(path.basename(o.targetDir), o.icons, o.motion), rootPath: 'app/layout.tsx', pagePath: 'app/page.tsx' }),
    doctorConfig: (o) => renderReactDoctorConfig(o.framework, o.motion),
  },
  packageScripts: (o) => buildScripts(o), skills: () => ['next-cache-components-adoption', 'next-cache-components-optimizer', 'next-dev-loop'],
  docs: { mergeStrategy: 'replace' },
};
