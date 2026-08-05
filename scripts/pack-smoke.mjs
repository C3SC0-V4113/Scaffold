#!/usr/bin/env node
// Packed-artifact smoke test for purrfold.
//
// Every other test in this repository runs the local dist/ bundle. This one
// runs the tarball users actually install: it packs the package, installs the
// tarball into a throwaway project, and drives the installed CLI. That is the
// only way to catch a missing entry in package.json "files", a bin mapping that
// points at nothing, or a bundle that cannot resolve its own package.json at
// runtime (src/cli.ts reads ../package.json relative to dist/index.js, so the
// output layout is load-bearing).
//
// Usage:
//   node scripts/pack-smoke.mjs
//   node scripts/pack-smoke.mjs --keep

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const keep = process.argv.includes('--keep');

// The repository convention for invoking package managers (see buildCli and
// hasCommand in scripts/e2e/harness.mjs): npm is a .cmd shim on Windows and
// cannot be spawned without a shell.
const npmShell = process.platform === 'win32';

const requiredPackedFiles = ['dist/index.js', 'README.md', 'llms.txt', 'package.json'];

function fail(message) {
  throw new Error(message);
}

function runNpm(args, options = {}) {
  const result = spawnSync('npm', args, {
    cwd: options.cwd ?? rootDir,
    encoding: 'utf8',
    shell: npmShell,
    stdio: options.capture ? 'pipe' : 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    fail(`npm ${args.join(' ')} failed with status ${result.status}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  }

  return result.stdout ?? '';
}

// Executes the installed entry point through the current Node binary rather
// than the generated .bin shim. The shim is npm's artifact, not ours, and
// spawning .cmd shims cross-platform is the exact fragility that already cost
// this repository a pile of workarounds in the E2E harness. Shim existence is
// asserted separately below, so the bin mapping is still covered.
function runCli(entryPoint, args, cwd) {
  return spawnSync(process.execPath, [entryPoint, ...args], {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: process.env,
  });
}

const packDir = mkdtempSync(path.join(tmpdir(), 'purrfold-pack-'));
const projectDir = mkdtempSync(path.join(tmpdir(), 'purrfold-pack-project-'));

try {
  const declaredVersion = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;

  // Real pack: `prepack` runs, so a broken build fails here exactly as it would
  // during `npm publish`.
  console.log('=== npm pack ===');
  runNpm(['pack', '--pack-destination', packDir]);

  const tarballs = readdirSync(packDir).filter((entry) => entry.endsWith('.tgz'));
  if (tarballs.length !== 1) {
    fail(`Expected exactly one packed tarball in ${packDir}, found: ${tarballs.join(', ') || '(none)'}`);
  }
  const tarball = path.join(packDir, tarballs[0]);

  // dist/ is now freshly built by the pack above, so the manifest is accurate.
  // --ignore-scripts keeps prepack's build output off stdout; without it the
  // --json payload is interleaved with tsup logs and cannot be parsed.
  const manifest = JSON.parse(runNpm(['pack', '--dry-run', '--ignore-scripts', '--json'], { capture: true }));
  const packedFiles = manifest[0].files.map((file) => file.path);
  console.log(`packed ${packedFiles.length} files: ${packedFiles.join(', ')}`);

  for (const required of requiredPackedFiles) {
    if (!packedFiles.includes(required)) {
      fail(`Packed tarball is missing ${required}. Packed files: ${packedFiles.join(', ')}`);
    }
  }

  console.log('\n=== install tarball ===');
  writeFileSync(
    path.join(projectDir, 'package.json'),
    `${JSON.stringify({ name: 'purrfold-pack-smoke', version: '0.0.0', private: true }, null, 2)}\n`
  );
  runNpm(['install', tarball, '--no-audit', '--no-fund', '--no-package-lock'], { cwd: projectDir });

  const installedRoot = path.join(projectDir, 'node_modules', 'purrfold');
  const installedManifest = JSON.parse(readFileSync(path.join(installedRoot, 'package.json'), 'utf8'));
  const declaredBin = installedManifest.bin?.purrfold;
  if (!declaredBin) {
    fail('Installed package.json does not declare a "purrfold" bin entry.');
  }

  const entryPoint = path.join(installedRoot, declaredBin);
  if (!existsSync(entryPoint)) {
    fail(`bin "purrfold" points at ${declaredBin}, which does not exist in the installed package.`);
  }

  // npm links the bin during install; a missing shim means the mapping never
  // took effect for a real user.
  const shim = path.join(projectDir, 'node_modules', '.bin', process.platform === 'win32' ? 'purrfold.cmd' : 'purrfold');
  if (!existsSync(shim)) {
    fail(`npm did not link the executable shim at ${shim}.`);
  }

  if (!readFileSync(entryPoint, 'utf8').startsWith('#!')) {
    fail(`${declaredBin} lost its shebang, so direct execution would fail on POSIX.`);
  }

  console.log('\n=== run installed CLI ===');
  const version = runCli(entryPoint, ['--version'], projectDir);
  if (version.status !== 0) {
    fail(`purrfold --version failed\n${version.stdout}${version.stderr}`);
  }
  if (version.stdout.trim() !== declaredVersion) {
    fail(`purrfold --version printed "${version.stdout.trim()}", expected "${declaredVersion}".`);
  }
  console.log(`--version -> ${version.stdout.trim()}`);

  const info = runCli(entryPoint, ['info', '--json'], projectDir);
  if (info.status !== 0) {
    fail(`purrfold info --json failed\n${info.stdout}${info.stderr}`);
  }
  let schema;
  try {
    schema = JSON.parse(info.stdout);
  } catch (error) {
    fail(`purrfold info --json did not emit valid JSON\n${info.stdout}\n${error.message}`);
  }
  if (schema.name !== 'purrfold' || schema.version !== declaredVersion) {
    fail(`info --json reported ${schema.name}@${schema.version}, expected purrfold@${declaredVersion}.`);
  }
  if (!Array.isArray(schema.options) || schema.options.length === 0) {
    fail('info --json reported no CLI options.');
  }
  if (!Array.isArray(schema.scenarios) || schema.scenarios.length === 0) {
    fail('info --json reported no scenarios.');
  }
  console.log(`info --json -> ${schema.options.length} options, ${schema.scenarios.length} scenarios`);

  const generation = runCli(entryPoint, ['pack-smoke-app', '--pm', 'npm', '--yes', '--dry-run'], projectDir);
  if (generation.status !== 0) {
    fail(`Dry-run generation failed\n${generation.stdout}${generation.stderr}`);
  }
  if (!generation.stdout.includes('run npx create-next-app@latest')) {
    fail(`Dry-run generation did not plan a create-next-app invocation\n${generation.stdout}`);
  }
  console.log('dry-run generation -> ok');

  console.log('\nPASS  packed artifact smoke test');
} finally {
  if (keep) {
    console.log(`\nPreserved pack dir: ${packDir}\nPreserved project dir: ${projectDir}`);
  } else {
    rmSync(packDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  }
}
