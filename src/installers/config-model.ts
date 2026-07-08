import type { CreateOptions } from '../types.js';

/**
 * Single source of truth for the versions purrfold pins when it installs
 * generated-app dependencies. We install with explicit `name@version`
 * specifiers (not bare names) because bare `bun add` / `pnpm add` / `npm i`
 * resolve to the absolute latest, which can escape create-next-app's existing
 * ranges and pull in a breaking major. The original symptom: bun resolved
 * `eslint` to v10, which removed `context.getFilename()` — still called by
 * `eslint-plugin-react` (a transitive dep of eslint-config-next) — so
 * `eslint .` crashed. npm/pnpm stayed on the `^9` range create-next-app set,
 * so only bun broke. Pinning here keeps all three package managers in lockstep.
 *
 * Bumping a pin is a deliberate act: change the version, then run the CLI E2E
 * suite (`npm run test:e2e:cli`) so an incompatible upgrade is caught here, not
 * in a generated project. create-next-app and shadcn stay on @latest by design.
 */
export const DEPENDENCY_VERSIONS: Record<string, string> = {
  // ESLint stays on v9 until eslint-plugin-react ships v10 support.
  eslint: '9.39.4',
  'eslint-config-next': '16.2.9',
  'eslint-config-prettier': '10.1.8',
  'eslint-plugin-import': '2.32.0',
  'eslint-import-resolver-typescript': '4.4.5',
  'eslint-plugin-react-doctor': '0.5.4',
  'eslint-plugin-react-you-might-not-need-an-effect': '1.0.0',
  prettier: '3.8.4',
  'prettier-plugin-tailwindcss': '0.8.0',
  husky: '9.1.7',
  'lint-staged': '16.4.0',
  'react-doctor': '0.5.4',
  'react-scan': '0.5.7',
  vitest: '4.1.8',
  '@vitejs/plugin-react': '5.1.2',
  'vite-tsconfig-paths': '5.1.4',
  jsdom: '29.1.1',
  '@testing-library/react': '16.3.2',
  '@testing-library/dom': '10.4.1',
  'eslint-plugin-testing-library': '7.16.2',
  '@vitest/eslint-plugin': '1.6.20',
  '@playwright/test': '1.60.0',
  'eslint-plugin-playwright': '2.10.4',
  '@commitlint/cli': '21.0.2',
  '@commitlint/config-conventional': '21.0.2',
  'lucide-react': '1.18.0',
  '@phosphor-icons/react': '2.1.10',
  '@tabler/icons-react': '3.44.0',
  astro: '7.0.6',
  '@astrojs/check': '0.9.9',
  '@astrojs/node': '11.0.2',
  '@astrojs/vercel': '11.0.2',
  '@astrojs/netlify': '8.1.1',
  '@astrojs/cloudflare': '14.1.2',
  'eslint-plugin-astro': '1.7.0',
  'typescript-eslint': '8.63.0',
  'prettier-plugin-astro': '0.14.1',
};

/**
 * Turn a bare package name into a pinned `name@version` install specifier.
 * Throws if the dependency has no registered pin so an unpinned dependency can
 * never silently ship.
 */
export function pinnedSpecifier(name: string): string {
  const version = DEPENDENCY_VERSIONS[name];
  if (!version) {
    throw new Error(`No pinned version registered for "${name}". Add it to DEPENDENCY_VERSIONS.`);
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

export const e2eDevDependencies = ['@playwright/test', 'eslint-plugin-playwright'];

export const commitlintDevDependencies = [
  '@commitlint/cli',
  '@commitlint/config-conventional',
];

export function buildDevDependencies(
  options: Pick<CreateOptions, 'framework' | 'unit' | 'e2e' | 'commitlint'>
) {
  return [
    ...(options.framework === 'astro' ? astroCoreDevDependencies : coreDevDependencies),
    ...(options.unit ? unitDevDependencies : []),
    ...(options.e2e ? e2eDevDependencies : []),
    ...(options.commitlint ? commitlintDevDependencies : []),
  ].map(pinnedSpecifier);
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
