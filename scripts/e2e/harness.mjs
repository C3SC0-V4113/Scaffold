import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)), '..');

export function readFlag(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

export function readListFlag(argv, flag) {
  const value = readFlag(argv, flag);
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

export function hasCommand(command) {
  const lookup = process.platform === 'win32' ? 'where' : 'command';
  const args = process.platform === 'win32' ? [command] : ['-v', command];
  return spawnSync(lookup, args, { stdio: 'ignore', shell: process.platform !== 'win32' }).status === 0;
}

export function buildCli() {
  execFileSync('npm', ['run', 'build'], { cwd: rootDir, stdio: 'inherit', shell: process.platform === 'win32' });
  return path.join(rootDir, 'dist', 'index.js');
}

export function createRunContext(argv, prefix = 'purrfold-e2e-') {
  const keep = argv.includes('--keep');
  const workDir = readFlag(argv, '--work-dir') ?? path.join(tmpdir(), `${prefix}${Date.now()}`);
  const stateDir = path.join(workDir, '_purrfold-e2e');
  const homeDir = path.join(stateDir, 'home');
  const cacheDir = path.join(stateDir, 'cache');
  const tempDir = path.join(stateDir, 'tmp');
  const pnpmHome = path.join(stateDir, 'pnpm-home');
  const bunCache = path.join(stateDir, 'bun-cache');
  const appDataDir = path.join(homeDir, 'AppData', 'Roaming');
  const localAppDataDir = path.join(homeDir, 'AppData', 'Local');
  mkdirSync(workDir, { recursive: true });
  for (const directory of [homeDir, cacheDir, tempDir, pnpmHome, bunCache, appDataDir, localAppDataDir]) {
    mkdirSync(directory, { recursive: true });
  }
  return {
    keep,
    workDir,
    stamp: new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14),
    env: {
      HOME: homeDir,
      USERPROFILE: homeDir,
      APPDATA: appDataDir,
      LOCALAPPDATA: localAppDataDir,
      XDG_CACHE_HOME: cacheDir,
      npm_config_cache: path.join(cacheDir, 'npm'),
      NPM_CONFIG_CACHE: path.join(cacheDir, 'npm'),
      PNPM_HOME: pnpmHome,
      BUN_INSTALL_CACHE_DIR: bunCache,
      TMP: tempDir,
      TEMP: tempDir,
    },
  };
}

function runProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    shell: options.shell ?? process.platform === 'win32',
    timeout: options.timeoutMs ?? 30 * 60 * 1000,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    error: result.error,
  };
}

function assertIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label} expected to include ${JSON.stringify(expected)}\n--- output ---\n${text}`);
  }
}

function assertNotIncludes(text, unexpected, label) {
  if (text.includes(unexpected)) {
    throw new Error(`${label} expected not to include ${JSON.stringify(unexpected)}\n--- output ---\n${text}`);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function assertPath(projectRoot, relativePath, shouldExist = true) {
  const target = path.join(projectRoot, relativePath);
  const exists = existsSync(target);
  if (exists !== shouldExist) {
    throw new Error(`${relativePath} ${shouldExist ? 'should exist' : 'should not exist'} in ${projectRoot}`);
  }
}

function packageManagerRunArgs(packageManager, script) {
  return packageManager === 'npm' ? ['run', script] : ['run', script];
}

function runGeneratedCheck(projectRoot, packageManager, env) {
  const command = packageManager ?? 'npm';
  if (!hasCommand(command)) {
    throw new Error(`${command} is required to run generated app checks`);
  }

  const result = runProcess(command, packageManagerRunArgs(command, 'check'), {
    cwd: projectRoot,
    env,
    timeoutMs: 30 * 60 * 1000,
  });

  if (result.status !== 0) {
    throw new Error(`Generated app check failed in ${projectRoot} with ${command} run check\n${result.output}`);
  }

  return result.output;
}

export function assertGeneratedApp(projectRoot, expected) {
  const packageJson = readJson(path.join(projectRoot, 'package.json'));
  const eslintConfig = readFileSync(path.join(projectRoot, 'eslint.config.mjs'), 'utf8');
  const readme = readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
  const agents = readFileSync(path.join(projectRoot, 'AGENTS.md'), 'utf8');

  assertPath(projectRoot, 'components/ui/button.tsx');
  assertPath(projectRoot, 'lib/utils.ts');
  assertPath(projectRoot, 'app/globals.css');
  assertIncludes(eslintConfig, "'components/ui/**'", 'eslint.config.mjs');
  assertIncludes(readme, 'shadcn MCP', 'README.md');
  assertIncludes(agents, 'shadcn MCP', 'AGENTS.md');

  if (expected.unit) {
    assertPath(projectRoot, 'vitest.config.mts');
    assertPath(projectRoot, 'tests/unit/home.test.tsx');
    if (!packageJson.scripts?.test) throw new Error('package.json should include test script');
  } else {
    assertPath(projectRoot, 'vitest.config.mts', false);
    assertPath(projectRoot, 'tests/unit/home.test.tsx', false);
    if (packageJson.scripts?.test) throw new Error('package.json should not include test script');
  }

  if (expected.e2e) {
    assertPath(projectRoot, 'playwright.config.ts');
    assertPath(projectRoot, 'tests/e2e/home.spec.ts');
    if (!packageJson.scripts?.['test:e2e']) throw new Error('package.json should include test:e2e script');
  } else {
    assertPath(projectRoot, 'playwright.config.ts', false);
    assertPath(projectRoot, 'tests/e2e/home.spec.ts', false);
  }

  if (expected.commitlint) {
    assertPath(projectRoot, 'commitlint.config.js');
    assertPath(projectRoot, '.husky/commit-msg');
  } else {
    assertPath(projectRoot, 'commitlint.config.js', false);
    assertPath(projectRoot, '.husky/commit-msg', false);
  }

  if (expected.pnpm) {
    const workspace = readFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), 'utf8');
    assertIncludes(workspace, 'minimumReleaseAge:', 'pnpm-workspace.yaml');
    assertIncludes(workspace, 'trustPolicy: no-downgrade', 'pnpm-workspace.yaml');
  }

  if (expected.mcp) {
    assertIncludes(readme, 'mcp init --client claude', 'README.md');
    assertIncludes(readme, 'mcp init --client codex', 'README.md');
    assertIncludes(readme, 'mcp init --client opencode', 'README.md');
  }
}

async function loadNodePty() {
  try {
    return await import('node-pty');
  } catch {
    return null;
  }
}

export async function hasNodePty() {
  return (await loadNodePty()) !== null;
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\[[0-9;?]*[ -/]*[@-~]/g;

function stripAnsi(text) {
  return text.replace(ANSI_PATTERN, '');
}

/**
 * Drive purrfold's own interactive prompts inside a pseudo-terminal. Keystrokes
 * from `scenario.input` are fed one at a time with a small delay so @inquirer
 * has time to render and consume each answer before the next arrives.
 */
function runInteractivePtyScenario(pty, scenario, context, cliPath, options) {
  const targetName = `${options.prefix ?? 'e2e'}-${scenario.name}-${context.stamp}`;
  const keys = [...(scenario.input ?? '')];

  return new Promise((resolve, reject) => {
    const child = pty.spawn(process.execPath, [cliPath, targetName, ...scenario.args], {
      name: 'xterm-color',
      cols: 100,
      rows: 30,
      cwd: context.workDir,
      env: { ...process.env, ...context.env },
    });

    let output = '';
    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(() => reject(new Error(`${scenario.name} timed out after 120s\n--- output ---\n${stripAnsi(output)}`)));
    }, 120000);

    const feed = (index) => {
      if (settled || index >= keys.length) return;
      child.write(keys[index]);
      setTimeout(() => feed(index + 1), 250);
    };
    setTimeout(() => feed(0), 600);

    child.onData((data) => {
      output += data;
    });

    child.onExit(({ exitCode }) => {
      finish(() => {
        const clean = stripAnsi(output);
        try {
          for (const expected of scenario.expectOutput ?? []) {
            assertIncludes(clean, expected, scenario.name);
          }
          for (const unexpected of scenario.rejectOutput ?? []) {
            assertNotIncludes(clean, unexpected, scenario.name);
          }
          if (exitCode !== 0) {
            throw new Error(`${scenario.name} exited with ${exitCode}\n--- output ---\n${clean}`);
          }
          resolve({ name: targetName, output: clean });
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

async function runTtyScenario(scenario, context, cliPath, options) {
  const pty = await loadNodePty();
  if (!pty) {
    throw new Error(`${scenario.name} requires node-pty. Install dev dependency node-pty when registry access is available.`);
  }

  if (scenario.kind === 'interactive') {
    return runInteractivePtyScenario(pty, scenario, context, cliPath, options);
  }

  // external-shadcn drives the real upstream shadcn CLI over the network and has
  // no defined assertions yet; keep it gated until its contract is specified.
  throw new Error(`${scenario.name} (${scenario.kind}) TTY automation is not implemented yet.`);
}

export async function runScenario(scenario, context, cliPath, options = {}) {
  for (const command of scenario.requires ?? []) {
    if (!hasCommand(command)) {
      throw new Error(`${scenario.name} requires ${command} on PATH`);
    }
  }

  if (scenario.requiresTty) {
    return runTtyScenario(scenario, context, cliPath, options);
  }

  const targetName = `${options.prefix ?? 'e2e'}-${scenario.name}-${context.stamp}`;
  const args = scenario.kind === 'dry-run' ? [cliPath, targetName, ...scenario.args] : [cliPath, targetName, ...scenario.args];
  const result = runProcess('node', args, { cwd: context.workDir, env: context.env, input: scenario.input });

  if (result.status !== 0) {
    throw new Error(`${scenario.name} failed with exit ${result.status}\n${result.output}`);
  }

  for (const expected of scenario.expectOutput ?? []) {
    assertIncludes(result.output, expected, scenario.name);
  }
  for (const unexpected of scenario.rejectOutput ?? []) {
    assertNotIncludes(result.output, unexpected, scenario.name);
  }

  if (scenario.kind === 'real') {
    const projectRoot = path.join(context.workDir, targetName);
    assertGeneratedApp(projectRoot, scenario.expect);
    const checkOutput = runGeneratedCheck(projectRoot, scenario.packageManager, context.env);
    return { name: targetName, output: result.output, checkOutput };
  }

  return { name: targetName, output: result.output };
}

export function cleanupContext(context) {
  if (!context.keep && context.workDir.includes(tmpdir())) {
    rmSync(context.workDir, { recursive: true, force: true });
  }
}
