import versions from '../versions.json' with { type: 'json' };

import type { CreateOptions } from '../types.js';

/**
 * The versions purrfold pins when it installs generated-app dependencies live
 * in src/versions.json — the single source of truth shared with the E2E
 * harness, scenarios, and tests, and the one file automated dependency tooling
 * needs to edit to bump a pin.
 *
 * We install with explicit `name@version` specifiers (not bare names) because
 * bare `bun add` / `pnpm add` / `npm i` resolve to the absolute latest, which
 * can escape create-next-app's existing ranges and pull in a breaking major.
 * The original symptom: bun resolved `eslint` to v10, which removed
 * `context.getFilename()` — still called by `eslint-plugin-react` (a
 * transitive dep of eslint-config-next) — so `eslint .` crashed. npm/pnpm
 * stayed on the `^9` range create-next-app set, so only bun broke. Pinning
 * keeps all three package managers in lockstep.
 *
 * Version constraints to respect when bumping src/versions.json:
 * - `eslint` stays on v9 until eslint-plugin-react ships v10 support.
 * - astroOverrides['@vitejs/plugin-react']: Astro 7 installs Vite 8 and
 *   @astrojs/react 6 requires plugin-react 5.2+, while Next stays on the
 *   Vite-6-compatible line.
 *
 * Bumping a pin is a deliberate act: change the version, then run the CLI E2E
 * suite (`npm run test:e2e:cli`) so an incompatible upgrade is caught here, not
 * in a generated project. create-next-app and shadcn stay on @latest by design.
 */
export const DEPENDENCY_VERSIONS: Record<string, string> = versions.dependencies;

const ASTRO_DEPENDENCY_VERSION_OVERRIDES: Record<string, string> = versions.astroOverrides;

/**
 * Turn a bare package name into a pinned `name@version` install specifier,
 * honoring framework-specific overrides. Throws if the dependency has no
 * registered pin so an unpinned dependency can never silently ship.
 */
export function pinnedSpecifier(name: string, framework: CreateOptions['framework'] = 'next'): string {
  const version =
    (framework === 'astro' ? ASTRO_DEPENDENCY_VERSION_OVERRIDES[name] : undefined) ??
    DEPENDENCY_VERSIONS[name];
  if (!version) {
    throw new Error(`No pinned version registered for "${name}". Add it to src/versions.json.`);
  }
  return `${name}@${version}`;
}

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

export const astroCoreDevDependencies = [
  'eslint',
  'eslint-config-prettier',
  'eslint-plugin-import',
  'eslint-import-resolver-typescript',
  'eslint-plugin-astro',
  'eslint-plugin-react-doctor',
  'eslint-plugin-react-you-might-not-need-an-effect',
  'typescript-eslint',
  'prettier',
  'prettier-plugin-astro',
  'prettier-plugin-tailwindcss',
  'husky',
  'lint-staged',
  'react-doctor',
  '@astrojs/check',
];

export const unitDevDependencies = [
  'vitest',
  '@vitejs/plugin-react',
  'vite-tsconfig-paths',
  'jsdom',
  '@testing-library/react',
  '@testing-library/dom',
  'eslint-plugin-testing-library',
  '@vitest/eslint-plugin',
];

export const e2eDevDependencies = ['@playwright/test', '@types/node', 'eslint-plugin-playwright'];

export const commitlintDevDependencies = [
  '@commitlint/cli',
  '@commitlint/config-conventional',
];

export function buildDevDependencies(
  options: Pick<CreateOptions, 'framework' | 'unit' | 'e2e' | 'commitlint'>
) {
  const frameworkUnitDependencies =
    options.framework === 'astro'
      ? unitDevDependencies.filter((name) => name !== 'vite-tsconfig-paths')
      : unitDevDependencies;

  return [
    ...(options.framework === 'astro' ? astroCoreDevDependencies : coreDevDependencies),
    ...(options.unit ? frameworkUnitDependencies : []),
    ...(options.e2e ? e2eDevDependencies : []),
    ...(options.commitlint ? commitlintDevDependencies : []),
  ].map((name) => pinnedSpecifier(name, options.framework));
}

export function buildScripts(
  options: Pick<CreateOptions, 'framework' | 'packageManager' | 'unit' | 'e2e'>
) {
  const run = options.packageManager === 'npm' ? 'npm run' : `${options.packageManager} run`;

  if (options.framework === 'astro') {
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
      doctor: 'astro check && react-doctor . --yes --blocking warning',
      'doctor:staged': 'astro check --noSync && react-doctor . --staged --blocking warning',
      'doctor:ci': 'astro check && react-doctor . --yes --blocking warning',
      'scan:init': 'astro dev --background',
      scan: 'astro dev',
      format: 'prettier --write .',
      'format:check': 'prettier --check .',
      typecheck: 'astro check',
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
