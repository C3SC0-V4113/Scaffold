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

function runMotionImportCheck(projectRoot, env) {
  const result = runProcess(
    process.execPath,
    ['--input-type=module', '--eval', "import('motion/react')"],
    { cwd: projectRoot, env, shell: false }
  );

  if (result.status !== 0) {
    throw new Error(`Motion React import failed in ${projectRoot}\n${result.output}`);
  }
}

export function assertGeneratedApp(projectRoot, expected) {
  const framework = expected.framework ?? 'next';
  const packageJson = readJson(path.join(projectRoot, 'package.json'));
  const eslintConfig = readFileSync(path.join(projectRoot, 'eslint.config.mjs'), 'utf8');
  const skillsScript = readFileSync(path.join(projectRoot, 'skills.sh'), 'utf8');

  if (expected.motion) {
    if (!packageJson.dependencies?.motion?.includes('12.42.2')) {
      throw new Error('package.json should include Motion 12.42.2 as a runtime dependency');
    }
    assertIncludes(skillsScript, 'freshtechbro/claudedesignskills', 'skills.sh');
    assertIncludes(skillsScript, '--skill motion-framer', 'skills.sh');
    const motionComponent =
      framework === 'astro'
        ? 'src/components/common/motion-main.tsx'
        : 'components/common/motion-main.tsx';
    const globalStylesheet =
      framework === 'astro' ? 'src/styles/global.css' : 'app/globals.css';
    assertPath(projectRoot, motionComponent);
    assertIncludes(
      readFileSync(path.join(projectRoot, globalStylesheet), 'utf8'),
      '@media (prefers-reduced-motion: reduce)',
      globalStylesheet
    );
  } else {
    if (packageJson.dependencies?.motion) {
      throw new Error('package.json should not include Motion unless --motion is selected');
    }
    assertNotIncludes(skillsScript, 'motion-framer', 'skills.sh');
    assertPath(
      projectRoot,
      framework === 'astro'
        ? 'src/components/common/motion-main.tsx'
        : 'components/common/motion-main.tsx',
      false
    );
  }

  if (framework === 'astro') {
    const tsconfig = readJson(path.join(projectRoot, 'tsconfig.json'));
    const astroConfig = readFileSync(path.join(projectRoot, 'astro.config.mjs'), 'utf8');

    assertPath(projectRoot, 'src/components/ui/button.tsx');
    assertPath(projectRoot, 'src/lib/utils.ts');
    assertPath(projectRoot, 'src/styles/global.css');
    assertPath(projectRoot, 'src/components/home-hero.tsx');
    assertPath(projectRoot, 'src/pages/index.astro');
    assertPath(projectRoot, 'src/layouts/main.astro');
    assertIncludes(eslintConfig, "'src/components/ui/**'", 'eslint.config.mjs');

    if (tsconfig.compilerOptions?.paths?.['@/*']?.[0] !== './src/*') {
      throw new Error('tsconfig.json should map @/* to ./src/*');
    }
    if (packageJson.dependencies?.['@astrojs/mdx'] || packageJson.dependencies?.['canvas-confetti']) {
      throw new Error('Astro starter-only dependencies should be removed');
    }
    if (!packageJson.devDependencies?.['react-doctor']) {
      throw new Error('Astro package.json should include react-doctor');
    }

    if (expected.ssrAdapter) {
      assertIncludes(astroConfig, "output: 'server'", 'astro.config.mjs');
      assertIncludes(astroConfig, `@astrojs/${expected.ssrAdapter}`, 'astro.config.mjs');
    } else {
      assertNotIncludes(astroConfig, "output: 'server'", 'astro.config.mjs');
    }
  } else {
    const readme = readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    const agents = readFileSync(path.join(projectRoot, 'AGENTS.md'), 'utf8');

    assertPath(projectRoot, 'components/ui/button.tsx');
    assertPath(projectRoot, 'lib/utils.ts');
    assertPath(projectRoot, 'app/globals.css');
    assertIncludes(eslintConfig, "'components/ui/**'", 'eslint.config.mjs');
    assertIncludes(readme, 'shadcn MCP', 'README.md');
    assertIncludes(agents, 'shadcn MCP', 'AGENTS.md');
  }

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
    assertIncludes(workspace, 'trustPolicyExclude:', 'pnpm-workspace.yaml');
    assertIncludes(workspace, 'allowBuilds:', 'pnpm-workspace.yaml');
    assertIncludes(workspace, 'unrs-resolver: true', 'pnpm-workspace.yaml');
  }

  if (expected.mcp && framework === 'next') {
    const readme = readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
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
 * Terminate a node-pty child and its descendants. On Windows `IPty.kill()` over
 * ConPTY does not reliably tear down the whole process tree (the wedge that hung
 * the full suite), so follow up with `taskkill /T /F` on the pid. Best-effort:
 * failures are swallowed so the caller's promise always settles.
 */
function killPtyChild(child) {
  try {
    child.kill();
  } catch {
    // already gone
  }

  if (process.platform === 'win32' && child.pid) {
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      // process tree already gone
    }
  }
}

const EXTERNAL_SHADCN_TIMEOUT_MS = 20 * 60 * 1000;

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
      killPtyChild(child);
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

/**
 * Drive a real, no-`--yes` purrfold generation whose embedded create-next-app
 * and shadcn init run interactively. Each entry in `scenario.interactions`
 * fires once the first time its `waitFor` marker appears, answering that prompt.
 * An idle fallback sends Enter when the process stalls on an unanticipated
 * prompt so a single new prompt does not hang the whole run. On exit the
 * generated app is asserted just like a `real` scenario; purrfold runs its own
 * `check` before exiting, so a zero exit already means the app's gate passed.
 */
function runExternalShadcnPtyScenario(pty, scenario, context, cliPath, options) {
  const targetName = `${options.prefix ?? 'e2e'}-${scenario.name}-${context.stamp}`;
  const interactions = (scenario.interactions ?? []).map((interaction) => ({
    ...interaction,
    fired: false,
  }));

  return new Promise((resolve, reject) => {
    const child = pty.spawn(process.execPath, [cliPath, targetName, ...scenario.args], {
      name: 'xterm-color',
      cols: 100,
      rows: 30,
      cwd: context.workDir,
      env: { ...process.env, ...context.env },
    });

    let output = '';
    let lastDataAt = Date.now();
    let idleNudges = 0;
    let settled = false;

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(idleCheck);
      fn();
    };

    const timer = setTimeout(() => {
      killPtyChild(child);
      finish(() => reject(new Error(`${scenario.name} timed out after 20m\n--- output ---\n${stripAnsi(output)}`)));
    }, EXTERNAL_SHADCN_TIMEOUT_MS);

    // Unanticipated prompt fallback: if nothing is emitted for a while and the
    // process is still running, nudge with Enter. Stray Enters during installs
    // are ignored, so this only matters when a prompt is actually waiting.
    const idleCheck = setInterval(() => {
      if (settled) return;
      if (Date.now() - lastDataAt > 20000 && idleNudges < 6) {
        idleNudges += 1;
        child.write('\r');
        lastDataAt = Date.now();
      }
    }, 5000);

    child.onData((data) => {
      output += data;
      lastDataAt = Date.now();
      const clean = stripAnsi(output);
      for (const interaction of interactions) {
        if (!interaction.fired && clean.includes(interaction.waitFor)) {
          interaction.fired = true;
          setTimeout(() => {
            if (!settled) child.write(interaction.send);
          }, 100);
        }
      }
    });

    child.onExit(({ exitCode }) => {
      finish(() => {
        const clean = stripAnsi(output);
        try {
          if (exitCode !== 0) {
            throw new Error(`${scenario.name} exited with ${exitCode}\n--- output ---\n${clean}`);
          }
          for (const expected of scenario.expectOutput ?? []) {
            assertIncludes(clean, expected, scenario.name);
          }
          const projectRoot = path.join(context.workDir, targetName);
          assertGeneratedApp(projectRoot, scenario.expect);
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

  if (scenario.kind === 'external-shadcn') {
    return runExternalShadcnPtyScenario(pty, scenario, context, cliPath, options);
  }

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
    assertGeneratedApp(projectRoot, {
      ...scenario.expect,
      framework: scenario.framework ?? 'next',
      ssrAdapter: scenario.ssrAdapter,
    });
    const checkOutput = runGeneratedCheck(projectRoot, scenario.packageManager, context.env);
    if (scenario.expect.motion) {
      runMotionImportCheck(projectRoot, context.env);
    }
    return { name: targetName, output: result.output, checkOutput };
  }

  return { name: targetName, output: result.output };
}

export function cleanupContext(context) {
  if (!context.keep && context.workDir.includes(tmpdir())) {
    rmSync(context.workDir, { recursive: true, force: true });
  }
}
