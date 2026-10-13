import path from 'node:path';

import { createAstroApp } from '../../installers/astro.js';
import { buildScripts } from '../../installers/config-model.js';
import { renderEslintConfig } from '../../templates/eslint.js';
import { renderAstroHomeHero, renderAstroHomePage, renderAstroRootLayout, renderAstroUnitSmokeTest, renderPrettierConfig, renderReactDoctorConfig, renderVitestConfig } from '../../templates/files.js';
import type { CreateOptions } from '../../types.js';
import type { FrameworkAdapter } from '../types.js';

export const astroAdapter: FrameworkAdapter = {
  id: 'astro', label: 'Astro', description: 'React-enabled Astro scaffold for shadcn-compatible projects.',
  capabilities: { packageManagers: ['npm', 'pnpm'], rendering: { ssr: true, adapters: ['node', 'vercel', 'netlify', 'cloudflare'], defaultAdapter: 'cloudflare' }, routers: [] },
  layout: { sourceRoot: 'src/', globalStylesheet: 'src/styles/global.css', utilsPath: 'src/lib/utils.ts', uiDir: 'src/components/ui', motionMainPath: 'src/components/common/motion-main.tsx' },
  scaffold: createAstroApp,
  shadcnInitArgs: () => ['-t', 'astro'],
  templates: {
    eslint: (o) => renderEslintConfig(o), prettier: (o) => renderPrettierConfig(o.framework),
    vitest: (o) => renderVitestConfig(o.framework), unitSmokeTest: () => renderAstroUnitSmokeTest(),
    appShell: (o) => ({ root: renderAstroRootLayout(), page: renderAstroHomePage(path.basename(o.targetDir), o.motion), rootPath: 'src/layouts/main.astro', pagePath: 'src/pages/index.astro' }),
    doctorConfig: (o) => renderReactDoctorConfig(o.framework, o.motion),
  },
  packageScripts: (o) => buildScripts(o), skills: () => ['astro'],
  docs: { mergeStrategy: 'merge' },
};
