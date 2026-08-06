import path from 'node:path';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { applyPackageJsonQualityConfig, type ProjectPackageJson } from '../src/installers/package-json.js';
import type { Executor } from '../src/types.js';
import versions from '../src/versions.json' with { type: 'json' };

class MemoryExecutor implements Executor {
  writtenJson: unknown;
  /** stdout `capture` should return, or undefined to simulate an unprobeable binary. */
  capturedOutput: string | undefined;

  constructor(
    private readonly packageJson?: ProjectPackageJson,
    capturedOutput?: string
  ) {
    this.capturedOutput = capturedOutput;
  }

  async run() {}

  async capture() {
    return this.capturedOutput;
  }

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
  it('declares the node floor that matches the installed runtime deps', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe('>=22.13.0');
  });

  it('packs every file the installed CLI needs at runtime', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      files?: string[];
      bin?: Record<string, string>;
    };

    // scripts/pack-smoke.mjs asserts these survive into the real tarball. Pinning
    // them here too means a dropped entry fails the fast gate instead of waiting
    // for the network-bound pack smoke.
    expect(packageJson.files).toEqual(expect.arrayContaining(['dist', 'README.md', 'llms.txt']));

    // src/cli.ts reads ../package.json relative to the bundle to resolve the
    // version, so the entry point has to stay exactly one directory below the
    // package root or `purrfold --version` throws on a clean install.
    expect(packageJson.bin?.purrfold).toBe('./dist/index.js');
  });

  it('publishes with provenance so releases stay attestable', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      publishConfig?: { provenance?: boolean };
    };

    // Dropping this silently downgrades every release to an unattested tarball,
    // which no test would otherwise notice.
    expect(packageJson.publishConfig?.provenance).toBe(true);
  });

  it('keeps package-lock.json on the same version as package.json', () => {
    const read = (file: string) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));

    const packageJson = read('package.json') as { version?: string };
    const lockfile = read('package-lock.json') as {
      version?: string;
      packages?: Record<string, { version?: string }>;
    };

    // `changeset version` bumps package.json only, so the release commit used to
    // ship a lockfile still recording the previous version. `npm ci` does not
    // care — it only rejects dependency mismatches — which is exactly why the
    // drift survived several releases unnoticed. `changeset:version` now chains
    // a `--package-lock-only` install; this pins the outcome.
    expect(lockfile.version).toBe(packageJson.version);
    expect(lockfile.packages?.['']?.version).toBe(packageJson.version);
  });

  it('does not add npm-conflicting prettier overrides for new projects', async () => {
    const executor = new MemoryExecutor();

    await applyPackageJsonQualityConfig('app', executor, {
      framework: 'next',
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
      framework: 'next',
      packageManager: 'pnpm',
      unit: false,
      e2e: false,
    });

    expect((executor.writtenJson as ProjectPackageJson).overrides).toEqual({
      react: '^19.0.0',
    });
  });

  it('adds Astro-friendly scripts for Astro projects', async () => {
    const executor = new MemoryExecutor();

    await applyPackageJsonQualityConfig('app', executor, {
      framework: 'astro',
      packageManager: 'pnpm',
      unit: true,
      e2e: true,
    });

    expect(executor.writtenJson).toMatchObject({
      scripts: expect.objectContaining({
        typecheck: 'astro check',
        scan: 'astro dev',
        'scan:init': 'astro dev --background',
        doctor: 'astro check && react-doctor . --yes --blocking warning',
        'doctor:design': 'react-doctor design . --yes --blocking warning',
        'doctor:ci': 'astro check && react-doctor . --yes --blocking warning',
        check: 'pnpm run lint && pnpm run typecheck && pnpm run format:check && pnpm run test && pnpm run doctor:ci',
      }),
    });
  });

  // `packageManager` is what makes the local toolchain and CI agree: pnpm
  // self-manages to it, and pnpm/action-setup reads it instead of taking a
  // `version:` input (passing both makes that action refuse to run).
  describe('packageManager field', () => {
    it('records the pnpm that is actually running', async () => {
      const executor = new MemoryExecutor(undefined, '10.14.0');

      await applyPackageJsonQualityConfig('app', executor, {
        framework: 'next',
        packageManager: 'pnpm',
        unit: false,
        e2e: false,
      });

      // The running pnpm wins over the versions.json pin: writing a version the
      // developer does not have would make pnpm download another major during
      // the installs and `check` that purrfold runs itself.
      expect((executor.writtenJson as ProjectPackageJson).packageManager).toBe('pnpm@10.14.0');
    });

    it('falls back to the pinned version when pnpm cannot be probed', async () => {
      const executor = new MemoryExecutor(undefined, undefined);

      await applyPackageJsonQualityConfig('app', executor, {
        framework: 'next',
        packageManager: 'pnpm',
        unit: false,
        e2e: false,
      });

      expect((executor.writtenJson as ProjectPackageJson).packageManager).toBe(
        `pnpm@${versions.toolchain.pnpm}`
      );
    });

    it('ignores unusable pnpm output', async () => {
      const executor = new MemoryExecutor(undefined, 'ERR_PNPM_NO_SCRIPT');

      await applyPackageJsonQualityConfig('app', executor, {
        framework: 'next',
        packageManager: 'pnpm',
        unit: false,
        e2e: false,
      });

      // `packageManager` only accepts an exact x.y.z; anything else would make
      // every later pnpm invocation fail on a malformed field.
      expect((executor.writtenJson as ProjectPackageJson).packageManager).toBe(
        `pnpm@${versions.toolchain.pnpm}`
      );
    });

    it.each(['npm', 'bun'] as const)('is not written for %s', async (packageManager) => {
      const executor = new MemoryExecutor(undefined, '10.14.0');

      await applyPackageJsonQualityConfig('app', executor, {
        framework: 'next',
        packageManager,
        unit: false,
        e2e: false,
      });

      // npm ships with Node (already pinned by setup-node) and bun is not
      // corepack-managed, so neither has the drift this field solves.
      expect((executor.writtenJson as ProjectPackageJson).packageManager).toBeUndefined();
    });

    it('pins an exact version so corepack accepts it', () => {
      expect(versions.toolchain.pnpm).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
