import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

type RunContext = {
  keep: boolean;
  workDir: string;
  cacheRoot: string;
  nodeExecutable: string;
  scenarioAdapters: Map<string, RunContext>;
  stamp: string;
  env: Record<string, string>;
};

type HarnessModule = {
  cleanupContext: (context: RunContext) => void;
  createRunContext: (argv: string[], prefix?: string) => RunContext;
  prepareScenarioContext: (
    scenario: Record<string, unknown>,
    context: RunContext,
    options?: { env?: Record<string, string | undefined>; pnpmExecutable?: string }
  ) => RunContext;
  readFlag: (argv: string[], flag: string) => string | undefined;
  readListFlag: (argv: string[], flag: string) => string[];
  resolveCacheRoot: (env?: Record<string, string | undefined>) => string;
  resolveExecutable: (command: string, env?: Record<string, string | undefined>) => string;
  runScenario: (
    scenario: Record<string, unknown>,
    context: RunContext,
    cliPath: string,
    options?: { prefix?: string }
  ) => Promise<{ name: string; output: string }>;
};

/**
 * The toolchain test provisions a real Node executable (hardlink, or a full
 * ~80MB binary copy when process.execPath and the work dir live on different
 * volumes) and then spawns three child processes against it. That warms up in
 * well under a second, but a cold filesystem cache — or the copy fallback —
 * does not reliably fit vitest's 5s default. The timeout is generous on
 * purpose: it must not be tightened toward the observed warm runtime.
 */
const TOOLCHAIN_TIMEOUT_MS = 60_000;

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
      expect(context.nodeExecutable).toBe(process.execPath);
      expect(context.env.HOME).toContain('_purrfold-e2e');
      expect(context.env.USERPROFILE).toBe(context.env.HOME);
      expect(context.env.TEMP).toContain('tmp');
      expect(existsSync(context.env.HOME)).toBe(true);
      expect(existsSync(context.env.TEMP)).toBe(true);
      expect(Object.keys(context.env).some((key) => key.toLowerCase() === 'path')).toBe(false);
      expect(existsSync(path.join(context.workDir, '_purrfold-e2e', 'toolchain'))).toBe(false);
    } finally {
      cleanupContext(context);
    }

    expect(existsSync(context.workDir)).toBe(false);
  });

  it('creates a pnpm toolchain that keeps outer and nested executable resolution consistent', async () => {
    const { cleanupContext, createRunContext, prepareScenarioContext, resolveExecutable, runScenario } =
      await loadHarness();
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'purrfold pnpm fixture '));
    const selectedDir = path.join(fixtureRoot, 'selected pnpm with spaces');
    const workDir = path.join(fixtureRoot, 'scenario run with spaces');
    const selectedPnpm = path.join(selectedDir, process.platform === 'win32' ? 'selected-pnpm.cmd' : 'selected-pnpm');
    const argument = '@scope/pkg@^1.2.3';

    try {
      mkdirSync(selectedDir, { recursive: true });
      if (process.platform === 'win32') {
        writeFileSync(path.join(selectedDir, 'fake-pnpm.mjs'), 'process.stdout.write(`${process.argv[2]}\\n`);\n');
        writeFileSync(selectedPnpm, '@echo off\r\n@node "%~dp0fake-pnpm.mjs" %*\r\n');
      } else {
        writeFileSync(selectedPnpm, '#!/bin/sh\nprintf \'%s\\n\' "$@"\n');
        chmodSync(selectedPnpm, 0o755);
      }

      const baseContext = createRunContext(['node', 'script', '--work-dir', workDir], 'unused-');
      const context = prepareScenarioContext(
        { kind: 'real', execution: { requires: ['pnpm'] } },
        baseContext,
        {
          pnpmExecutable: selectedPnpm,
        }
      );
      const toolchainDir = path.join(workDir, '_purrfold-e2e', 'toolchain', 'node_modules', '.bin');
      const pnpmForwarder = path.join(toolchainDir, process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm');
      const pathKey = Object.keys(context.env).find((key) => key.toLowerCase() === 'path');
      const inheritedPathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';

      expect(pathKey).toBe(inheritedPathKey);
      expect(context.nodeExecutable).toBe(path.join(toolchainDir, process.platform === 'win32' ? 'node.exe' : 'node'));
      expect(existsSync(context.nodeExecutable)).toBe(true);
      expect(existsSync(pnpmForwarder)).toBe(true);
      expect(context.env[pathKey!]).toBe(
        [toolchainDir, process.env[inheritedPathKey] ?? ''].filter(Boolean).join(path.delimiter)
      );
      expect(context.env[pathKey!].split(path.delimiter).filter((entry) => entry === toolchainDir)).toHaveLength(1);

      const child = spawnSync(context.nodeExecutable, ['-p', 'process.execPath'], {
        encoding: 'utf8',
        env: { ...process.env, ...context.env },
        shell: false,
      });
      expect(child.status).toBe(0);
      expect(path.resolve(child.stdout.trim())).toBe(path.resolve(context.nodeExecutable));

      const nestedPnpm = resolveExecutable('pnpm', {
        ...process.env,
        ...context.env,
      });
      expect(path.resolve(nestedPnpm)).toBe(path.resolve(pnpmForwarder));
      expect(path.dirname(child.stdout.trim())).toBe(path.dirname(nestedPnpm));

      const forwarderContent = readFileSync(pnpmForwarder, 'utf8');
      if (process.platform === 'win32') {
        expect(forwarderContent).toContain('@"%~dp0node.exe" "%~dp0pnpm-forwarder.mjs" %*');
        expect(forwarderContent.toLowerCase()).not.toContain('call ');
        expect(readFileSync(path.join(toolchainDir, 'pnpm-forwarder.mjs'), 'utf8')).toContain(
          path.basename(selectedPnpm)
        );
      } else {
        expect(forwarderContent).toContain(`exec '${selectedPnpm}' "$@"`);
      }

      const tinyexecUrl = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tinyexec', 'dist', 'main.mjs')).href;
      const tinyexecProbe = path.join(fixtureRoot, 'tinyexec-probe.mjs');
      writeFileSync(
        tinyexecProbe,
        `import { xSync } from ${JSON.stringify(tinyexecUrl)};\n` +
          `const result = xSync('pnpm', [process.argv[2]], { nodeOptions: { env: process.env } });\n` +
          `process.stdout.write(result.stdout);\n` +
          `process.stderr.write(result.stderr);\n` +
          `process.exitCode = result.exitCode ?? 1;\n`
      );
      const forwarded = spawnSync(context.nodeExecutable, [tinyexecProbe, argument], {
        cwd: toolchainDir,
        encoding: 'utf8',
        env: { ...process.env, ...context.env },
        shell: false,
      });
      if (forwarded.status !== 0) {
        throw new Error(
          JSON.stringify({
            status: forwarded.status,
            stdout: forwarded.stdout,
            stderr: forwarded.stderr,
            error: forwarded.error?.message,
            command: nestedPnpm,
          })
        );
      }
      expect(forwarded.stdout.trim()).toBe(argument);

      const probeCli = path.join(fixtureRoot, 'probe-cli.mjs');
      writeFileSync(probeCli, 'console.log(process.execPath);\n');
      const result = await runScenario(
        {
          name: 'toolchain-node-probe',
          kind: 'dry-run',
          args: [],
          expectOutput: [context.nodeExecutable],
        },
        context,
        probeCli,
        { prefix: 'probe' }
      );
      expect(result.output).toContain(context.nodeExecutable);

      cleanupContext(baseContext);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, TOOLCHAIN_TIMEOUT_MS);

  it.skipIf(process.platform !== 'win32')(
    'resolves the pnpm.cmd shim instead of an earlier extensionless pnpm file',
    async () => {
      const { resolveExecutable } = await loadHarness();
      const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'purrfold pnpm resolution '));
      const brokenDir = path.join(fixtureRoot, 'broken');
      const validDir = path.join(fixtureRoot, 'valid');
      const validPnpm = path.join(validDir, 'pnpm.cmd');

      try {
        mkdirSync(brokenDir, { recursive: true });
        mkdirSync(validDir, { recursive: true });
        writeFileSync(path.join(brokenDir, 'pnpm'), 'not an executable shim');
        writeFileSync(validPnpm, '@echo off\r\n');
        const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'Path';
        const resolved = resolveExecutable('pnpm', {
          ...process.env,
          [pathKey]: [brokenDir, validDir].join(path.delimiter),
        });

        expect(path.resolve(resolved)).toBe(path.resolve(validPnpm));
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    }
  );

  it('does not resolve pnpm for a pnpm-labelled dry-run when PATH lacks pnpm', async () => {
    const { cleanupContext, createRunContext, runScenario } = await loadHarness();
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'purrfold dry-run no pnpm '));
    const context = createRunContext(['node', 'script', '--work-dir', path.join(fixtureRoot, 'run')]);
    const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
    context.env[pathKey] = fixtureRoot;
    const probeCli = path.join(fixtureRoot, 'probe-cli.mjs');
    writeFileSync(probeCli, 'console.log("dry-run reached");\n');

    try {
      const result = await runScenario(
        {
          name: 'pnpm-dry-run-without-runtime-requirement',
          kind: 'dry-run',
          packageManager: 'pnpm',
          execution: { requires: [] },
          args: [],
          expectOutput: ['dry-run reached'],
        },
        context,
        probeCli
      );

      expect(result.output).toContain('dry-run reached');
      expect(context.scenarioAdapters.size).toBe(0);
    } finally {
      cleanupContext(context);
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('prepares mixed selections lazily so missing pnpm does not block npm scenarios', async () => {
    const { cleanupContext, createRunContext, prepareScenarioContext } = await loadHarness();
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'purrfold mixed pm '));
    const context = createRunContext(['node', 'script', '--work-dir', path.join(fixtureRoot, 'run')]);
    const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
    const envWithoutPnpm = { ...process.env, [pathKey]: fixtureRoot };
    const npmScenario = { kind: 'real', execution: { requires: ['npm'] } };
    const pnpmScenario = { kind: 'real', execution: { requires: ['pnpm'] } };

    try {
      expect(prepareScenarioContext(npmScenario, context, { env: envWithoutPnpm })).toBe(context);
      expect(() => prepareScenarioContext(pnpmScenario, context, { env: envWithoutPnpm })).toThrow(
        'Could not resolve pnpm on the inherited PATH.'
      );
      expect(prepareScenarioContext(npmScenario, context, { env: envWithoutPnpm })).toBe(context);
      expect(context.scenarioAdapters.size).toBe(0);
    } finally {
      cleanupContext(context);
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
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
      expect(context.env.pnpm_config_store_dir).toBe(context.env.npm_config_store_dir);
      expect(context.env.PNPM_CONFIG_STORE_DIR).toBe(context.env.npm_config_store_dir);
      expect(context.env.BUN_INSTALL_CACHE_DIR).toBe(path.join(override, 'bun'));
      // Caches live outside the per-run work dir so cleanup cannot remove them.
      const relativeCachePath = path.relative(context.workDir, context.cacheRoot);
      expect(
        relativeCachePath === '..' ||
          relativeCachePath.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relativeCachePath)
      ).toBe(true);
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
