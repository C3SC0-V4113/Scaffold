import versions from '../versions.json' with { type: 'json' };

import type { CreateOptions, Framework } from '../types.js';

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
 * - `eslint-plugin-astro` stays on v1: v2 peer-requires eslint >= 10, so it
 *   moves together with the eslint major (npm fails ERESOLVE on it; pnpm only
 *   warns, which is why only npm Astro scenarios caught it).
 * - shared `vite` 7 and `@vitejs/plugin-react` 5.1.x pins keep the Next unit
 *   toolchain compatible. Vite's scaffold has its own Vite 8 pins in
 *   viteOverrides; Vitest 5 and plugin-react 6 support that major.
 * - astroOverrides['@vitejs/plugin-react']: Astro 7 installs Vite 8 and
 *   @astrojs/react 6 requires plugin-react 5.2+, while Next unit tooling keeps
 *   using the shared pins above.
 *
 * Bumping a pin is a deliberate act: change the version, then run the CLI E2E
 * suite (`npm run test:e2e:cli`) so an incompatible upgrade is caught here, not
 * in a generated project. create-next-app and shadcn stay on @latest by design.
 */
export const DEPENDENCY_VERSIONS: Record<string, string> =
  versions.dependencies;

export const ASTRO_DEPENDENCY_VERSION_OVERRIDES: Record<string, string> =
  versions.astroOverrides;
export const VITE_DEPENDENCY_VERSION_OVERRIDES: Record<string, string> =
  versions.viteOverrides;
export const REACT_ROUTER_DEPENDENCY_VERSION_OVERRIDES: Record<string, string> =
  versions.reactRouterOverrides;
export const FRAMEWORK_DEPENDENCY_OVERRIDES: Record<
  Framework,
  Readonly<Record<string, string>>
> = {
  next: {},
  astro: ASTRO_DEPENDENCY_VERSION_OVERRIDES,
  vite: VITE_DEPENDENCY_VERSION_OVERRIDES,
  'react-router': REACT_ROUTER_DEPENDENCY_VERSION_OVERRIDES,
};

/**
 * Turn a bare package name into a pinned `name@version` install specifier,
 * honoring framework-specific overrides. Throws if the dependency has no
 * registered pin so an unpinned dependency can never silently ship.
 */
export function pinnedSpecifier(
  name: string,
  framework: CreateOptions['framework'] = 'next',
): string {
  const version =
    FRAMEWORK_DEPENDENCY_OVERRIDES[framework][name] ??
    DEPENDENCY_VERSIONS[name];
  if (!version) {
    throw new Error(
      `No pinned version registered for "${name}". Add it to src/versions.json.`,
    );
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
  '@shadcn/lint',
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
  '@shadcn/lint',
];

export const viteCoreDevDependencies = [
  'eslint',
  'eslint-config-prettier',
  'eslint-plugin-import',
  'eslint-import-resolver-typescript',
  'eslint-plugin-react-doctor',
  'eslint-plugin-react-you-might-not-need-an-effect',
  'eslint-plugin-react-hooks',
  'eslint-plugin-react-refresh',
  'typescript-eslint',
  'prettier',
  'prettier-plugin-tailwindcss',
  'husky',
  'lint-staged',
  'react-doctor',
  'react-scan',
  '@shadcn/lint',
];

export const reactRouterCoreDevDependencies = viteCoreDevDependencies.filter(
  (dependency) => dependency !== 'eslint-plugin-react-refresh',
);

export const unitDevDependencies = [
  'vitest',
  'vite',
  '@vitejs/plugin-react',
  'vite-tsconfig-paths',
  'jsdom',
  '@testing-library/react',
  '@testing-library/dom',
  'eslint-plugin-testing-library',
  '@vitest/eslint-plugin',
];

/**
 * Unit-test dependencies a generated Astro app must not install, and why.
 *
 * - `vite`: Astro depends on Vite directly, so declaring it again would pin a
 *   second, narrower range against the one Astro already resolved.
 * - `vite-tsconfig-paths`: the Vite 8 Astro installs resolves tsconfig paths
 *   natively, which the Astro adapter's Vitest config uses instead.
 */
export const ASTRO_UNIT_DEPENDENCY_EXCLUSIONS = [
  'vite',
  'vite-tsconfig-paths',
] as const;
export const VITE_UNIT_DEPENDENCY_EXCLUSIONS = [
  'vite',
  '@vitejs/plugin-react',
  'vite-tsconfig-paths',
] as const;
export const FRAMEWORK_DEVELOPMENT_DEPENDENCIES: Record<
  Framework,
  { core: readonly string[]; unitExclusions: readonly string[] }
> = {
  next: {
    core: coreDevDependencies,
    unitExclusions: [],
  },
  astro: {
    core: astroCoreDevDependencies,
    unitExclusions: ASTRO_UNIT_DEPENDENCY_EXCLUSIONS,
  },
  vite: {
    // create-vite's react-ts template floats `typescript` (~7.0.x since
    // create-vite 9.3.0), but typescript-eslint only supports TS < 6.1 until
    // TS 7.1 ships a JS API. Re-pinning it here keeps `lint` working; drop it
    // once the Renovate TS 7 major PR goes green.
    core: [...viteCoreDevDependencies, 'typescript'],
    unitExclusions: VITE_UNIT_DEPENDENCY_EXCLUSIONS,
  },
  'react-router': {
    core: reactRouterCoreDevDependencies,
    unitExclusions: ['vite', 'vite-tsconfig-paths'],
  },
};

export const e2eDevDependencies = [
  '@playwright/test',
  '@types/node',
  'eslint-plugin-playwright',
];

export const commitlintDevDependencies = [
  '@commitlint/cli',
  '@commitlint/config-conventional',
];
export const FRAMEWORK_PACKAGE_SCRIPT_CONFIG: Record<
  Framework,
  {
    doctor: string;
    doctorStaged: string;
    scanInit?: string;
    scan?: string;
    typecheck: string;
  }
> = {
  next: {
    doctor: 'react-doctor . --yes --blocking warning',
    doctorStaged: 'react-doctor . --staged --blocking warning',
    scanInit: 'react-scan init -y --skip-install',
    scan: 'next dev',
    typecheck: 'tsc --noEmit',
  },
  astro: {
    doctor: 'astro check && react-doctor . --yes --blocking warning',
    doctorStaged:
      'astro check --noSync && react-doctor . --staged --blocking warning',
    scanInit: 'astro dev --background',
    scan: 'astro dev',
    typecheck: 'astro check',
  },
  vite: {
    doctor: 'react-doctor . --yes --blocking warning',
    doctorStaged: 'react-doctor . --staged --blocking warning',
    scanInit: 'react-scan init -y --skip-install',
    scan: 'vite',
    typecheck: 'tsc -b',
  },
  'react-router': {
    doctor: 'react-doctor . --yes --blocking warning',
    doctorStaged: 'react-doctor . --staged --blocking warning',
    scanInit: 'react-scan init -y --skip-install',
    scan: 'react-router dev',
    typecheck: 'react-router typegen && tsc',
  },
};

export function buildDevDependencies(
  options: Pick<CreateOptions, 'framework' | 'unit' | 'e2e' | 'commitlint'>,
  config: {
    core: readonly string[];
    unitExclusions: readonly string[];
  } = FRAMEWORK_DEVELOPMENT_DEPENDENCIES[options.framework],
) {
  const frameworkUnitDependencies = unitDevDependencies.filter(
    (name) => !config.unitExclusions.includes(name),
  );
  return [
    ...config.core,
    ...(options.unit ? frameworkUnitDependencies : []),
    ...(options.e2e ? e2eDevDependencies : []),
    ...(options.commitlint ? commitlintDevDependencies : []),
  ].map((name) => pinnedSpecifier(name, options.framework));
}

export function buildScripts(
  options: Pick<CreateOptions, 'framework' | 'packageManager' | 'unit' | 'e2e'>,
  config: {
    doctor: string;
    doctorStaged: string;
    scanInit?: string;
    scan?: string;
    typecheck: string;
  } = FRAMEWORK_PACKAGE_SCRIPT_CONFIG[options.framework],
) {
  const run =
    options.packageManager === 'npm'
      ? 'npm run'
      : `${options.packageManager} run`;
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
    doctor: config.doctor,
    'doctor:design': 'react-doctor design . --yes --blocking warning',
    'doctor:staged': config.doctorStaged,
    'doctor:ci': config.doctor,
    ...(config.scanInit ? { 'scan:init': config.scanInit } : {}),
    ...(config.scan ? { scan: config.scan } : {}),
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    typecheck: config.typecheck,
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
