import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

type RunContext = {
  keep: boolean;
  workDir: string;
  cacheRoot: string;
  stamp: string;
  env: Record<string, string>;
};

type HarnessModule = {
  cleanupContext: (context: RunContext) => void;
  createRunContext: (argv: string[], prefix?: string) => RunContext;
  readFlag: (argv: string[], flag: string) => string | undefined;
  readListFlag: (argv: string[], flag: string) => string[];
  resolveCacheRoot: (env?: Record<string, string | undefined>) => string;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadHarness(): Promise<HarnessModule> {
  const url = pathToFileURL(path.join(process.cwd(), 'scripts/e2e/harness.mjs')).href;
  return (await import(url)) as HarnessModule;
}

describe('CLI E2E harness', () => {
  it('parses scalar and list flags', async () => {
    const { readFlag, readListFlag } = await loadHarness();
    const argv = ['node', 'script', '--work-dir', 'E:\\Repositorios\\smoke', '--scenario', 'a,b'];

    expect(readFlag(argv, '--work-dir')).toBe('E:\\Repositorios\\smoke');
    expect(readListFlag(argv, '--scenario')).toEqual(['a', 'b']);
    expect(readFlag(argv, '--missing')).toBeUndefined();
  });

  it('creates an isolated package-manager environment and cleans temporary work dirs', async () => {
    const { cleanupContext, createRunContext } = await loadHarness();
    const context = createRunContext(['node', 'script'], 'purrfold-harness-test-');

    try {
      expect(context.workDir.startsWith(tmpdir())).toBe(true);
      expect(context.env.HOME).toContain('_purrfold-e2e');
      expect(context.env.USERPROFILE).toBe(context.env.HOME);
      expect(context.env.TEMP).toContain('tmp');
      expect(existsSync(context.env.HOME)).toBe(true);
      expect(existsSync(context.env.TEMP)).toBe(true);
    } finally {
      cleanupContext(context);
    }

    expect(existsSync(context.workDir)).toBe(false);
  });

  it('shares package-manager caches across runs and honors PURRFOLD_E2E_CACHE_DIR', async () => {
    const { cleanupContext, createRunContext, resolveCacheRoot } = await loadHarness();
    // Distinct prefixes: workDir is also created under tmpdir() with a
    // Date.now() suffix, and a same-millisecond collision would make the
    // "cache lives outside the work dir" assertion compare a path to itself.
    const override = path.join(tmpdir(), `purrfold-harness-cache-override-${Date.now()}`);
    vi.stubEnv('PURRFOLD_E2E_CACHE_DIR', override);

    expect(resolveCacheRoot({ PURRFOLD_E2E_CACHE_DIR: override })).toBe(override);
    expect(resolveCacheRoot({})).not.toContain('_purrfold-e2e');

    const context = createRunContext(['node', 'script'], 'purrfold-harness-cache-run-');
    try {
      expect(context.cacheRoot).toBe(override);
      expect(context.env.npm_config_cache).toBe(path.join(override, 'npm'));
      expect(context.env.npm_config_store_dir).toBe(path.join(override, 'pnpm-store'));
      expect(context.env.BUN_INSTALL_CACHE_DIR).toBe(path.join(override, 'bun'));
      // Caches live outside the per-run work dir so cleanup cannot remove them.
      expect(context.env.npm_config_cache.startsWith(context.workDir)).toBe(false);
      expect(existsSync(context.env.npm_config_cache)).toBe(true);
    } finally {
      cleanupContext(context);
    }

    expect(existsSync(context.workDir)).toBe(false);
    expect(existsSync(path.join(override, 'npm'))).toBe(true);
    rmSync(override, { recursive: true, force: true });
  });

  it('preserves a temporary work dir only when --keep is explicit', async () => {
    const { cleanupContext, createRunContext } = await loadHarness();
    const context = createRunContext(['node', 'script', '--keep'], 'purrfold-harness-keep-test-');

    cleanupContext(context);
    expect(existsSync(context.workDir)).toBe(true);

    const cleanupContextWithoutKeep = { ...context, keep: false };
    cleanupContext(cleanupContextWithoutKeep);
    expect(existsSync(context.workDir)).toBe(false);
  });
});
