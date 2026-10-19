import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)), '..');

// Kept in sync with src/frameworks/*/index.ts by cli-e2e-catalog.test.ts.
export const frameworkLayouts = {
  next: { sourceRoot: '', globalStylesheet: 'app/globals.css', utilsPath: 'lib/utils.ts', uiDir: 'components/ui', importAlias: '@/', editHint: 'app/page.tsx', eslintConfigPath: 'eslint.config.mjs', vitestConfigPath: 'vitest.config.mts' },
  astro: { sourceRoot: 'src/', globalStylesheet: 'src/styles/global.css', utilsPath: 'src/lib/utils.ts', uiDir: 'src/components/ui', importAlias: '@/', editHint: 'src/pages/index.astro', eslintConfigPath: 'eslint.config.mjs', vitestConfigPath: 'vitest.config.mts' },
  vite: { sourceRoot: 'src/', globalStylesheet: 'src/index.css', utilsPath: 'src/lib/utils.ts', uiDir: 'src/components/ui', importAlias: '@/', editHint: 'src/App.tsx', eslintConfigPath: 'eslint.config.js', vitestConfigPath: 'vitest.config.ts' },
  'react-router': { sourceRoot: 'app/', globalStylesheet: 'app/app.css', utilsPath: 'app/lib/utils.ts', uiDir: 'app/components/ui', importAlias: '~/', editHint: 'app/routes/home.tsx', eslintConfigPath: 'eslint.config.js', vitestConfigPath: 'vitest.config.ts' },
};

export const featureFiles = {
  motion: {
    next: 'components/common/motion-main.tsx',
    astro: 'src/components/common/motion-main.tsx',
    vite: 'src/components/common/motion-main.tsx',
    'react-router': 'app/components/common/motion-main.tsx',
  },
  query: {
    next: 'components/providers/query-provider.tsx',
    astro: 'src/lib/query-provider.tsx',
    vite: 'src/lib/query-provider.tsx',
    'react-router': 'app/lib/query-provider.tsx',
  },
};

// Keep catalog construction dependency-free so CI can enumerate scenarios
// before npm installs the runtime E2E harness dependencies.
export const generatedVersions = JSON.parse(
  readFileSync(path.join(rootDir, 'src', 'versions.json'), 'utf8')
);

export const frameworkVersionOverrides = {
  astro: generatedVersions.astroOverrides,
  vite: generatedVersions.viteOverrides,
  'react-router': generatedVersions.reactRouterOverrides,
};

for (const framework of Object.keys(generatedVersions).filter((key) => key.endsWith('Overrides'))) {
  const frameworkId = (framework === 'reactRouterOverrides' ? 'react-router' : framework.replace(/Overrides$/, '').toLowerCase());
  if (!(frameworkId in frameworkVersionOverrides)) {
    throw new Error(`No E2E catalog override mapping registered for "${framework}" in src/versions.json.`);
  }
}

export function pinnedDependency(name, framework = 'next') {
  const version =
    frameworkVersionOverrides[framework]?.[name] ??
    generatedVersions.dependencies[name];
  if (!version) {
    throw new Error(`No pinned version registered for "${name}" in src/versions.json.`);
  }
  return `${name}@${version}`;
}

export function readFlag(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

export function readListFlag(argv, flag) {
  const value = readFlag(argv, flag);
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}
