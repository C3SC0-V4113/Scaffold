import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

function resolveNpmCli(): string {
  if (process.env.npm_execpath && existsSync(process.env.npm_execpath)) {
    return process.env.npm_execpath;
  }

  if (process.platform === 'win32') {
    const whereExecutable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'where.exe');
    const result = spawnSync(whereExecutable, ['npm.cmd'], { encoding: 'utf8', shell: false });
    for (const npmCommand of result.stdout?.split(/\r?\n/).filter(Boolean) ?? []) {
      const npmCli = path.join(path.dirname(npmCommand), 'node_modules', 'npm', 'bin', 'npm-cli.js');
      if (existsSync(npmCli)) return npmCli;
    }
  } else {
    const shell = existsSync('/bin/sh') ? '/bin/sh' : 'sh';
    const result = spawnSync(shell, ['-c', 'command -v npm'], { encoding: 'utf8', shell: false });
    const npmCommand = result.stdout?.trim();
    if (npmCommand && existsSync(npmCommand)) return realpathSync(npmCommand);
  }

  throw new Error('Could not locate npm-cli.js for the dependency-isolated quick E2E regression.');
}

function quotePosix(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function pathContainsPnpm(directory: string): boolean {
  const normalized = directory.replace(/^"|"$/g, '');
  const candidates =
    process.platform === 'win32' ? ['pnpm', 'pnpm.cmd', 'pnpm.exe', 'pnpm.bat', 'pnpm.com'] : ['pnpm'];
  return candidates.some((candidate) => existsSync(path.join(normalized, candidate)));
}

describe('CLI E2E catalog boundary', () => {
  it('lists valid non-empty scenario JSON without node_modules or the runtime harness', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'purrfold dependency-free catalog '));
    const fixtureScripts = path.join(fixtureRoot, 'scripts');
    const fixtureE2e = path.join(fixtureScripts, 'e2e');
    const fixtureSrc = path.join(fixtureRoot, 'src');

    try {
      mkdirSync(fixtureE2e, { recursive: true });
      mkdirSync(fixtureSrc, { recursive: true });
      copyFileSync(path.join(process.cwd(), 'scripts', 'cli-e2e.mjs'), path.join(fixtureScripts, 'cli-e2e.mjs'));
      copyFileSync(path.join(process.cwd(), 'scripts', 'e2e', 'catalog.mjs'), path.join(fixtureE2e, 'catalog.mjs'));
      copyFileSync(path.join(process.cwd(), 'scripts', 'e2e', 'scenarios.mjs'), path.join(fixtureE2e, 'scenarios.mjs'));
      copyFileSync(path.join(process.cwd(), 'src', 'versions.json'), path.join(fixtureSrc, 'versions.json'));

      expect(existsSync(path.join(fixtureRoot, 'node_modules'))).toBe(false);
      expect(existsSync(path.join(fixtureE2e, 'harness.mjs'))).toBe(false);

      const result = spawnSync(process.execPath, [path.join(fixtureScripts, 'cli-e2e.mjs'), '--list'], {
        cwd: fixtureRoot,
        encoding: 'utf8',
        shell: false,
      });
      expect(result.status, result.stderr).toBe(0);
      const scenarios = JSON.parse(result.stdout) as Array<{
        kind: string;
        packageManager: string;
        quick: boolean;
        execution: { requires: string[] };
      }>;

      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios.filter((scenario) => scenario.quick).every((scenario) => scenario.kind === 'dry-run')).toBe(
        true
      );
      expect(
        scenarios
          .filter((scenario) => scenario.kind === 'dry-run' && scenario.packageManager === 'pnpm')
          .every((scenario) => !scenario.execution.requires.includes('pnpm'))
      ).toBe(true);
      expect(
        scenarios
          .filter((scenario) => scenario.kind === 'real' && scenario.packageManager === 'pnpm')
          .every((scenario) => scenario.execution.requires.includes('pnpm'))
      ).toBe(true);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('keeps workflow matrix generation fail-fast and validates a non-empty JSON array', () => {
    const workflow = readFileSync(path.join(process.cwd(), '.github', 'workflows', 'e2e.yml'), 'utf8');

    expect(workflow).toContain('set -euo pipefail');
    expect(workflow).toContain('node scripts/cli-e2e.mjs --list > "$catalog_file"');
    expect(workflow).toContain('if type != "array" then error("scenario catalog must be a JSON array")');
    expect(workflow).toContain('error("scenario matrix is empty after filtering dry-runs")');
    expect(workflow).not.toContain('scenarios=$(node scripts/cli-e2e.mjs --list');
    expect(workflow).not.toContain('node scripts/cli-e2e.mjs --list |');
  });

  it(
    'runs the actual quick orchestration without pnpm on PATH',
    () => {
      const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'purrfold quick without pnpm '));
      const nodeExecutable = path.join(fixtureRoot, process.platform === 'win32' ? 'node.exe' : 'node');
      const npmExecutable = path.join(fixtureRoot, process.platform === 'win32' ? 'npm.cmd' : 'npm');
      const npmCli = resolveNpmCli();
      const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
      const inheritedEntries = (process.env[pathKey] ?? '').split(path.delimiter).filter(Boolean);
      const safeEntries = inheritedEntries.filter((entry) => !pathContainsPnpm(entry));
      const safePath = [fixtureRoot, ...safeEntries].join(path.delimiter);
      const expectedQuickScenarios = [
        'dry-run-defaults',
        'dry-run-motion-next-npm',
        'dry-run-motion-astro-pnpm',
        'dry-run-mcp-preset-pnpm',
        'dry-run-reported-b6-mcp-npm',
        'dry-run-astro-ssg-npm',
        'dry-run-astro-ssr-cloudflare-pnpm',
      ];

      try {
        try {
          linkSync(process.execPath, nodeExecutable);
        } catch {
          copyFileSync(process.execPath, nodeExecutable);
        }
        if (process.platform === 'win32') {
          const escapedNpmCli = npmCli.replaceAll('%', '%%');
          writeFileSync(npmExecutable, `@echo off\r\n@"%~dp0node.exe" "${escapedNpmCli}" %*\r\n`);
        } else {
          chmodSync(nodeExecutable, 0o755);
          writeFileSync(
            npmExecutable,
            `#!/bin/sh\nexec "$(dirname "$0")/node" ${quotePosix(npmCli)} "$@"\n`
          );
          chmodSync(npmExecutable, 0o755);
        }

        expect(safePath.split(path.delimiter).some(pathContainsPnpm)).toBe(false);
        const result = spawnSync(nodeExecutable, ['scripts/cli-e2e.mjs', '--quick'], {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: { ...process.env, [pathKey]: safePath },
          shell: false,
          timeout: 120_000,
        });
        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
        for (const scenario of expectedQuickScenarios) {
          expect(result.stdout).toContain(`PASS  quick-${scenario}-`);
        }
        expect(result.stdout.match(/^PASS  /gm)).toHaveLength(expectedQuickScenarios.length);
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
    180_000
  );
});
