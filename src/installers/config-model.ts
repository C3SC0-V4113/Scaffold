import type { CreateOptions } from '../types.js';

export const coreDevDependencies = [
  'eslint',
  'eslint-config-next',
  'eslint-config-prettier',
  'eslint-plugin-import',
  'eslint-import-resolver-typescript',
  'eslint-plugin-react-doctor',
  'eslint-plugin-react-you-might-not-need-an-effect',
  'prettier',
  'prettier-plugin-tailwindcss',
  'husky',
  'lint-staged',
  'react-doctor',
  'react-scan',
];

export const unitDevDependencies = [
  'vitest',
  '@vitejs/plugin-react',
  'jsdom',
  '@testing-library/react',
  '@testing-library/dom',
  'eslint-plugin-testing-library',
  '@vitest/eslint-plugin',
];

export const e2eDevDependencies = ['@playwright/test', 'eslint-plugin-playwright'];

export const commitlintDevDependencies = [
  '@commitlint/cli',
  '@commitlint/config-conventional',
];

export function buildDevDependencies(options: Pick<CreateOptions, 'unit' | 'e2e' | 'commitlint'>) {
  return [
    ...coreDevDependencies,
    ...(options.unit ? unitDevDependencies : []),
    ...(options.e2e ? e2eDevDependencies : []),
    ...(options.commitlint ? commitlintDevDependencies : []),
  ];
}

export function buildScripts(options: Pick<CreateOptions, 'packageManager' | 'unit' | 'e2e'>) {
  const run = options.packageManager === 'npm' ? 'npm run' : `${options.packageManager} run`;

  return {
    ...(options.unit
      ? {
          test: 'vitest run',
          'test:watch': 'vitest',
        }
      : {}),
    ...(options.e2e
      ? {
          'test:e2e': 'playwright test',
          'test:e2e:ui': 'playwright test --ui',
        }
      : {}),
    ...(options.unit && options.e2e
      ? {
          'test:all': `${run} test && ${run} test:e2e`,
        }
      : {}),
    lint: 'eslint . --no-warn-ignored --max-warnings 0',
    'lint:fix': 'eslint . --fix --no-warn-ignored --max-warnings 0',
    doctor: 'react-doctor . --yes --blocking warning',
    'doctor:staged': 'react-doctor . --staged --blocking warning',
    'doctor:ci': 'react-doctor . --yes --blocking warning',
    'scan:init': 'react-scan init -y --skip-install',
    scan: 'next dev',
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    typecheck: 'tsc --noEmit',
    check: [
      `${run} lint`,
      `${run} typecheck`,
      `${run} format:check`,
      ...(options.unit ? [`${run} test`] : []),
      `${run} doctor:ci`,
    ].join(' && '),
    prepare: 'husky',
  };
}
