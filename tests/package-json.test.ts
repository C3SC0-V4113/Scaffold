import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { applyPackageJsonQualityConfig, type ProjectPackageJson } from '../src/installers/package-json.js';
import type { Executor } from '../src/types.js';

class MemoryExecutor implements Executor {
  writtenJson: unknown;

  constructor(private readonly packageJson?: ProjectPackageJson) {}

  async run() {}

  async ensureDir() {}

  async pathExists(filePath: string) {
    return filePath.endsWith(path.join('app', 'package.json')) && this.packageJson !== undefined;
  }

  async readFile() {
    return JSON.stringify(this.packageJson);
  }

  async writeFile() {}

  async writeJson(_filePath: string, value: unknown) {
    this.writtenJson = value;
  }

  async remove() {}

  async symlinkOrJunction() {}
}

describe('package.json quality config', () => {
  it('does not add npm-conflicting prettier overrides for new projects', async () => {
    const executor = new MemoryExecutor();

    await applyPackageJsonQualityConfig('app', executor, {
      packageManager: 'npm',
      unit: true,
      e2e: false,
    });

    expect(executor.writtenJson).toMatchObject({
      scripts: expect.objectContaining({
        test: 'vitest run',
        check: 'npm run lint && npm run typecheck && npm run format:check && npm run test && npm run doctor:ci',
      }),
      'lint-staged': expect.any(Object),
    });
    expect((executor.writtenJson as ProjectPackageJson).overrides).toBeUndefined();
  });

  it('removes legacy prettier overrides while preserving user overrides', async () => {
    const executor = new MemoryExecutor({
      name: 'app',
      overrides: {
        'eslint-config-prettier': '^10.1.8',
        'eslint-plugin-prettier': '^5.5.4',
        react: '^19.0.0',
      },
    });

    await applyPackageJsonQualityConfig('app', executor, {
      packageManager: 'pnpm',
      unit: false,
      e2e: false,
    });

    expect((executor.writtenJson as ProjectPackageJson).overrides).toEqual({
      react: '^19.0.0',
    });
  });
});
