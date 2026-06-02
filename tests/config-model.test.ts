import { describe, expect, it } from 'vitest';

import { buildDevDependencies, buildScripts } from '../src/installers/config-model.js';

describe('quality config model', () => {
  it('includes optional dependency groups', () => {
    expect(buildDevDependencies({ unit: true, e2e: true, commitlint: true })).toEqual(
      expect.arrayContaining([
        'react-doctor',
        'react-scan',
        'vitest',
        '@testing-library/react',
        'eslint-plugin-testing-library',
        '@playwright/test',
        'eslint-plugin-playwright',
        '@commitlint/cli',
      ])
    );
  });

  it('omits optional dependency groups when disabled', () => {
    expect(buildDevDependencies({ unit: false, e2e: false, commitlint: false })).not.toEqual(
      expect.arrayContaining(['vitest', '@playwright/test', '@commitlint/cli'])
    );
  });

  it('generates package-manager-specific scripts', () => {
    const scripts = buildScripts({ packageManager: 'pnpm', unit: true, e2e: true });

    expect(scripts.check).toBe(
      'pnpm run lint && pnpm run typecheck && pnpm run format:check && pnpm run test && pnpm run doctor:ci'
    );
    expect(scripts['test:all']).toBe('pnpm run test && pnpm run test:e2e');
  });

  it('omits test scripts when unit and e2e are disabled', () => {
    const scripts = buildScripts({ packageManager: 'bun', unit: false, e2e: false });

    expect(scripts.test).toBeUndefined();
    expect(scripts['test:e2e']).toBeUndefined();
    expect(scripts.check).toBe('bun run lint && bun run typecheck && bun run format:check && bun run doctor:ci');
  });
});
