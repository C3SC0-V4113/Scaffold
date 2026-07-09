import { describe, expect, it } from 'vitest';

import { buildDevDependencies, buildScripts, pinnedSpecifier } from '../src/installers/config-model.js';

describe('quality config model', () => {
  it('includes optional dependency groups as pinned specifiers', () => {
    expect(buildDevDependencies({ framework: 'next', unit: true, e2e: true, commitlint: true })).toEqual(
      expect.arrayContaining(
        [
          'react-doctor',
          'react-scan',
          'vitest',
          '@vitejs/plugin-react',
          'vite-tsconfig-paths',
          '@testing-library/react',
          'eslint-plugin-testing-library',
          '@playwright/test',
          '@types/node',
          'eslint-plugin-playwright',
          '@commitlint/cli',
        ].map(pinnedSpecifier)
      )
    );
    expect(
      buildDevDependencies({ framework: 'next', unit: true, e2e: false, commitlint: false }).some((dependency) =>
        dependency === '@vitejs/plugin-react@6.0.2'
      )
    ).toBe(false);
    expect(buildDevDependencies({ framework: 'next', unit: true, e2e: false, commitlint: false })).not.toEqual(
      expect.arrayContaining(['vite@7.2.7'])
    );
  });

  it('includes Astro-specific quality dependencies', () => {
    const deps = buildDevDependencies({ framework: 'astro', unit: true, e2e: false, commitlint: false });

    expect(deps).toEqual(
      expect.arrayContaining(
        ['eslint-plugin-astro', 'typescript-eslint', 'prettier-plugin-astro', '@astrojs/check'].map(
          pinnedSpecifier
        )
      )
    );
    expect(deps).not.toContain(pinnedSpecifier('eslint-config-next'));
    expect(deps).toContain(pinnedSpecifier('react-doctor'));
    expect(deps).toContain('@vitejs/plugin-react@5.2.0');
    expect(deps).not.toContain(pinnedSpecifier('@vitejs/plugin-react'));
    expect(deps).not.toContain(pinnedSpecifier('vite-tsconfig-paths'));
  });

  it('omits optional dependency groups when disabled', () => {
    expect(buildDevDependencies({ framework: 'next', unit: false, e2e: false, commitlint: false })).not.toEqual(
      expect.arrayContaining(
        ['vitest', '@playwright/test', '@commitlint/cli'].map(pinnedSpecifier)
      )
    );
  });

  it('pins every installed dev dependency to an exact version', () => {
    const deps = buildDevDependencies({ framework: 'next', unit: true, e2e: true, commitlint: true });

    for (const dep of deps) {
      expect(dep).toMatch(/@\d+\.\d+\.\d+$/);
    }
  });

  it('generates package-manager-specific scripts', () => {
    const scripts = buildScripts({ framework: 'next', packageManager: 'pnpm', unit: true, e2e: true });

    expect(scripts.check).toBe(
      'pnpm run lint && pnpm run typecheck && pnpm run format:check && pnpm run test && pnpm run doctor:ci'
    );
    expect(scripts['test:all']).toBe('pnpm run test && pnpm run test:e2e');
  });

  it('omits test scripts when unit and e2e are disabled', () => {
    const scripts = buildScripts({ framework: 'next', packageManager: 'bun', unit: false, e2e: false });

    expect(scripts.test).toBeUndefined();
    expect(scripts['test:e2e']).toBeUndefined();
    expect(scripts.check).toBe('bun run lint && bun run typecheck && bun run format:check && bun run doctor:ci');
  });

  it('generates Astro-specific scripts', () => {
    const scripts = buildScripts({ framework: 'astro', packageManager: 'npm', unit: true, e2e: true });

    expect(scripts.typecheck).toBe('astro check');
    expect(scripts.scan).toBe('astro dev');
    expect(scripts['scan:init']).toBe('astro dev --background');
    expect(scripts.doctor).toBe('astro check && react-doctor . --yes --blocking warning');
    expect(scripts['doctor:ci']).toBe('astro check && react-doctor . --yes --blocking warning');
    expect(scripts.check).toBe(
      'npm run lint && npm run typecheck && npm run format:check && npm run test && npm run doctor:ci'
    );
  });
});
