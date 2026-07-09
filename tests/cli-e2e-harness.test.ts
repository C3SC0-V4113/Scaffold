import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

type RunContext = {
  keep: boolean;
  workDir: string;
  stamp: string;
  env: Record<string, string>;
};

type HarnessModule = {
  cleanupContext: (context: RunContext) => void;
  createRunContext: (argv: string[], prefix?: string) => RunContext;
  readFlag: (argv: string[], flag: string) => string | undefined;
  readListFlag: (argv: string[], flag: string) => string[];
};

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
      expect(context.env.npm_config_cache).toContain('cache');
      expect(context.env.TEMP).toContain('tmp');
      expect(existsSync(context.env.HOME)).toBe(true);
      expect(existsSync(context.env.TEMP)).toBe(true);
    } finally {
      cleanupContext(context);
    }

    expect(existsSync(context.workDir)).toBe(false);
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
