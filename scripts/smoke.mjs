#!/usr/bin/env node
// End-to-end smoke scenarios for purrfold.
//
// Builds the local CLI, then generates real apps across package managers,
// shadcn presets, testing, and commitlint combinations. Each generated app
// self-tests (purrfold runs `check` after generating), so a generation that
// exits 0 means that scenario is green out-of-the-box.
//
// Usage:
//   node scripts/smoke.mjs
//   node scripts/smoke.mjs --work-dir E:\Repositorios\smoke
//   node scripts/smoke.mjs --keep
//
// Bun is skipped unless `bunx` is available on PATH.

import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

function readFlag(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasCommand(command) {
  const lookup = process.platform === 'win32' ? 'where' : 'command';
  const args = process.platform === 'win32' ? [command] : ['-v', command];
  return spawnSync(lookup, args, { stdio: 'ignore', shell: process.platform !== 'win32' }).status === 0;
}

const keep = process.argv.includes('--keep');
const workDir =
  readFlag('--work-dir') ?? mkdtempSync(path.join(tmpdir(), 'purrfold-smoke-'));

const cases = [
  {
    name: 'npm-default-unit',
    args: ['--pm', 'npm', '--unit', '--no-e2e', '--no-commitlint', '--yes'],
  },
  {
    name: 'pnpm-b3-commitlint',
    args: [
      '--pm',
      'pnpm',
      '--unit',
      '--no-e2e',
      '--commitlint',
      '--shadcn-args',
      '--preset',
      'b3REw8vwo',
      '--yes',
    ],
  },
  {
    name: 'npm-b1-no-tests',
    args: [
      '--pm',
      'npm',
      '--no-unit',
      '--no-e2e',
      '--no-commitlint',
      '--shadcn-args',
      '--preset',
      'b1sSLwZVp',
      '--yes',
    ],
  },
  {
    name: 'pnpm-b2-e2e',
    args: [
      '--pm',
      'pnpm',
      '--unit',
      '--e2e',
      '--no-commitlint',
      '--shadcn-args',
      '--preset',
      'b2qMI9ufY',
      '--yes',
    ],
  },
  {
    name: 'bun-b5-minimal',
    args: [
      '--pm',
      'bun',
      '--no-unit',
      '--no-e2e',
      '--no-commitlint',
      '--shadcn-args',
      '--preset',
      'b5eH0WVTX',
      '--yes',
    ],
    requires: 'bunx',
  },
];

if (!existsSync(workDir)) {
  mkdirSync(workDir, { recursive: true });
}

console.log('Building purrfold...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

const cliPath = path.join(rootDir, 'dist', 'index.js');
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const results = [];

for (const smokeCase of cases) {
  if (smokeCase.requires && !hasCommand(smokeCase.requires)) {
    console.log(`\nSKIP ${smokeCase.name}: ${smokeCase.requires} is not available on PATH`);
    results.push({ name: smokeCase.name, ok: true, skipped: true });
    continue;
  }

  const targetName = `sm-${smokeCase.name}-${stamp}`;
  console.log(`\n=== ${targetName} ===`);
  try {
    execFileSync('node', [cliPath, targetName, ...smokeCase.args], {
      cwd: workDir,
      stdio: 'inherit',
    });
    results.push({ name: targetName, ok: true });
  } catch {
    results.push({ name: targetName, ok: false });
  }
}

if (!keep && readFlag('--work-dir') === undefined) {
  rmSync(workDir, { recursive: true, force: true });
}

console.log('\n=== Smoke results ===');
for (const { name, ok, skipped } of results) {
  console.log(`${skipped ? 'SKIP' : ok ? 'PASS' : 'FAIL'}  ${name}`);
}

const failed = results.filter((result) => !result.ok);
process.exit(failed.length > 0 ? 1 : 0);
