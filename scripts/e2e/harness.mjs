import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { generatedVersions, pinnedDependency, readFlag, readListFlag, rootDir } from './catalog.mjs';

export { generatedVersions, pinnedDependency, readFlag, readListFlag, rootDir };

export function hasCommand(command) {
  const lookup = process.platform === 'win32' ? 'where' : 'command';
  const args = process.platform === 'win32' ? [command] : ['-v', command];
  return (
    spawnSync(lookup, args, {
      stdio: 'ignore',
      shell: process.platform !== 'win32',
    }).status === 0
  );
}

export function resolveExecutable(command, env = process.env) {
  let result;
  let executable;
  if (process.platform === 'win32') {
    const systemRoot = env.SystemRoot ?? env.SYSTEMROOT ?? process.env.SystemRoot ?? 'C:\\Windows';
    const whereExecutable = path.join(systemRoot, 'System32', 'where.exe');
    const lookup = (candidate) => {
      const lookupResult = spawnSync(whereExecutable, [candidate], {
        env,
        encoding: 'utf8',
        shell: false,
      });
      return {
        result: lookupResult,
        matches: lookupResult.stdout?.split(/\r?\n/).filter(Boolean) ?? [],
      };
    };

    const primary = lookup(command.toLowerCase() === 'pnpm' ? 'pnpm.cmd' : command);
    result = primary.result;
    executable = primary.matches[0];

    if (command.toLowerCase() === 'pnpm' && (!executable || path.extname(executable).toLowerCase() !== '.cmd')) {
      const fallback = lookup(command);
      const executableExtensions = new Set(
        (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').map((extension) => extension.toLowerCase())
      );
      result = fallback.result;
      executable = fallback.matches.find((match) => executableExtensions.has(path.extname(match).toLowerCase()));
    }
  } else {
    result = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], {
      env,
      encoding: 'utf8',
      shell: false,
    });
    executable = result.stdout?.split(/\r?\n/).find(Boolean);
  }

  if (result.status !== 0 || !executable) {
    throw new Error(
      `Could not resolve ${command} on the inherited PATH.\n${result.stderr ?? result.error?.message ?? ''}`
    );
  }

  return executable;
}

export function buildCli() {
  execFileSync('npm', ['run', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return path.join(rootDir, 'dist', 'index.js');
}

/**
 * Root for package-manager caches shared across E2E runs. Unlike the per-run
 * HOME/config isolation, download caches are content-addressed and safe to
 * reuse, and recreating them cold on every run is what made the suite slow.
 * Override with PURRFOLD_E2E_CACHE_DIR (CI points this at a restored
 * actions/cache directory); delete the directory to force a cold run.
 */
export function resolveCacheRoot(env = process.env) {
  return env.PURRFOLD_E2E_CACHE_DIR ?? path.join(homedir(), '.cache', 'purrfold-e2e');
}

function quotePosix(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function createPnpmToolchain(toolchainDir, pnpmExecutable) {
  if (!existsSync(pnpmExecutable)) {
    throw new Error(`Resolved pnpm executable does not exist: ${pnpmExecutable}`);
  }

  const nodeExecutable = path.join(toolchainDir, process.platform === 'win32' ? 'node.exe' : 'node');
  try {
    linkSync(process.execPath, nodeExecutable);
  } catch {
    copyFileSync(process.execPath, nodeExecutable);
    if (process.platform !== 'win32') {
      chmodSync(nodeExecutable, 0o755);
    }
  }

  const pnpmForwarder = path.join(toolchainDir, process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm');
  if (process.platform === 'win32') {
    const require = createRequire(import.meta.url);
    const tinyexecModuleUrl = pathToFileURL(require.resolve('tinyexec')).href;
    const selectedBinParent = path.join(toolchainDir, 'selected', 'node_modules');
    const selectedBinDir = path.join(selectedBinParent, '.bin');
    mkdirSync(selectedBinParent, { recursive: true });
    symlinkSync(path.dirname(pnpmExecutable), selectedBinDir, 'junction');
    const selectedPnpm = path.join(selectedBinDir, path.basename(pnpmExecutable));
    const pnpmLauncher = path.join(toolchainDir, 'pnpm-forwarder.mjs');
    writeFileSync(
      pnpmLauncher,
      `import { xSync } from ${JSON.stringify(tinyexecModuleUrl)};\n` +
        `const result = xSync(${JSON.stringify(selectedPnpm)}, process.argv.slice(2), {\n` +
        `  nodePath: false,\n` +
        `  nodeOptions: { env: process.env, stdio: 'inherit' },\n` +
        `});\n` +
        `process.exitCode = result.exitCode ?? 1;\n`
    );
    writeFileSync(pnpmForwarder, '@echo off\r\n@"%~dp0node.exe" "%~dp0pnpm-forwarder.mjs" %*\r\n');
  } else {
    writeFileSync(pnpmForwarder, `#!/bin/sh\nexec ${quotePosix(pnpmExecutable)} "$@"\n`);
    chmodSync(pnpmForwarder, 0o755);
  }

  return nodeExecutable;
}

export function createRunContext(argv, prefix = 'purrfold-e2e-') {
  const keep = argv.includes('--keep');
  const requestedWorkDir = readFlag(argv, '--work-dir') ?? path.join(tmpdir(), `${prefix}${Date.now()}`);
  mkdirSync(requestedWorkDir, { recursive: true });
  // Canonicalize before deriving anything from it. On Windows runners tmpdir()
  // returns the 8.3 short form (C:\Users\RUNNER~1\...), while Vite resolves
  // modules through the long form (C:\Users\runneradmin\...). Generating under
  // the short path makes the generated app's own vitest fail with "Cannot find
  // module /@fs/<long path>/tests/unit/home.test.tsx" — the two spellings name
  // the same directory and nothing reconciles them. Real users never have this,
  // so the harness must not manufacture it.
  const workDir = realpathSync.native(requestedWorkDir);
  const stateDir = path.join(workDir, '_purrfold-e2e');
  const homeDir = path.join(stateDir, 'home');
  const tempDir = path.join(stateDir, 'tmp');
  const pnpmHome = path.join(stateDir, 'pnpm-home');
  const appDataDir = path.join(homeDir, 'AppData', 'Roaming');
  const localAppDataDir = path.join(homeDir, 'AppData', 'Local');
  // Shared across runs (never cleaned up by cleanupContext).
  const cacheRoot = resolveCacheRoot();
  const npmCache = path.join(cacheRoot, 'npm');
  const pnpmStore = path.join(cacheRoot, 'pnpm-store');
  const bunCache = path.join(cacheRoot, 'bun');
  const xdgCache = path.join(cacheRoot, 'xdg');
  mkdirSync(workDir, { recursive: true });
  for (const directory of [
    homeDir,
    tempDir,
    pnpmHome,
    appDataDir,
    localAppDataDir,
    npmCache,
    pnpmStore,
    bunCache,
    xdgCache,
  ]) {
    mkdirSync(directory, { recursive: true });
  }
  return {
    keep,
    workDir,
    cacheRoot,
    nodeExecutable: process.execPath,
    scenarioAdapters: new Map(),
    stamp: new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14),
    env: {
      HOME: homeDir,
      USERPROFILE: homeDir,
      APPDATA: appDataDir,
      LOCALAPPDATA: localAppDataDir,
      XDG_CACHE_HOME: xdgCache,
      npm_config_cache: npmCache,
      NPM_CONFIG_CACHE: npmCache,
      // Export npm-compatible and pnpm-native spellings so nested pnpm
      // versions agree on one shared content-addressed store.
      npm_config_store_dir: pnpmStore,
      pnpm_config_store_dir: pnpmStore,
      PNPM_CONFIG_STORE_DIR: pnpmStore,
      PNPM_HOME: pnpmHome,
      BUN_INSTALL_CACHE_DIR: bunCache,
      TMP: tempDir,
      TEMP: tempDir,
    },
  };
}

export function prepareScenarioContext(scenario, context, options = {}) {
  const requires = scenario.execution?.requires ?? [];
  if (!requires.includes('pnpm')) {
    return context;
  }

  const cached = context.scenarioAdapters.get('pnpm');
  if (cached) {
    return cached;
  }

  const lookupEnv = options.env ?? process.env;
  const pnpmExecutable = options.pnpmExecutable ?? resolveExecutable('pnpm', lookupEnv);
  const toolchainDir = path.join(
    context.workDir,
    '_purrfold-e2e',
    'toolchain',
    'node_modules',
    '.bin'
  );
  mkdirSync(toolchainDir, { recursive: true });
  const nodeExecutable = createPnpmToolchain(toolchainDir, pnpmExecutable);
  const pathKey = Object.keys(lookupEnv).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  const inheritedPath = lookupEnv[pathKey] ?? '';
  const scenarioContext = {
    ...context,
    nodeExecutable,
    env: {
      ...context.env,
      [pathKey]: [toolchainDir, inheritedPath].filter(Boolean).join(path.delimiter),
    },
  };
  context.scenarioAdapters.set('pnpm', scenarioContext);
  return scenarioContext;
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

function countOccurrences(text, value) {
  return text.split(value).length - 1;
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

function runGeneratedDoctorDesign(projectRoot, packageManager, env) {
  const command = packageManager ?? 'npm';
  const result = runProcess(command, packageManagerRunArgs(command, 'doctor:design'), {
    cwd: projectRoot,
    env,
    timeoutMs: 10 * 60 * 1000,
  });

  if (result.status !== 0) {
    throw new Error(
      `Generated design audit failed in ${projectRoot} with ${command} run doctor:design\n${result.output}`
    );
  }

  assertIncludes(result.output, 'Design scans do not affect the React health score.', 'doctor:design output');
}

/**
 * Functional commitlint check: actually load the config and lint a valid
 * message. Catches config-format bugs (e.g. CommonJS config in a
 * "type": "module" Astro app) that file-existence assertions cannot see.
 */
function runCommitlintCheck(projectRoot, packageManager, env) {
  const exec =
    packageManager === 'pnpm'
      ? { command: 'pnpm', args: ['exec', 'commitlint'] }
      : packageManager === 'bun'
      ? { command: 'bunx', args: ['--bun', 'commitlint'] }
      : { command: 'npx', args: ['commitlint'] };
  const result = runProcess(exec.command, exec.args, {
    cwd: projectRoot,
    env,
    input: 'feat: e2e commitlint check\n',
  });

  if (result.status !== 0) {
    throw new Error(`commitlint failed to lint a valid message in ${projectRoot}\n${result.output}`);
  }
}

/**
 * Hooks must be ACTIVE, not just present: package managers do not run the
 * `prepare` script on targeted installs, so purrfold activates husky
 * explicitly. Verify git actually points at the husky hooks directory.
 */
function assertHuskyActive(projectRoot) {
  const result = runProcess('git', ['config', '--local', '--get', 'core.hooksPath'], {
    cwd: projectRoot,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      `Could not read local git core.hooksPath in ${projectRoot}\n${result.output}${
        result.error ? `\n${result.error.message}` : ''
      }`
    );
  }

  if (!result.stdout.includes('.husky')) {
    throw new Error(
      `git core.hooksPath should point at .husky in ${projectRoot} (husky was not activated)\n${result.output}`
    );
  }
}

function assertHuskyInactive(projectRoot) {
  const result = runProcess('git', ['config', '--local', '--get', 'core.hooksPath'], {
    cwd: projectRoot,
  });

  // `git config --get` exits 1 with no output when the key is unset. Any
  // other non-zero result is a command/config error and must not be mistaken
  // for the expected unset state.
  if (result.error || result.status !== 1 || result.stdout.trim() !== '' || result.stderr.trim() !== '') {
    const detail = result.error ? `${result.output}\n${result.error.message}` : result.output;
    throw new Error(
      result.status === 0
        ? `git core.hooksPath should remain unset when dependency installation is skipped in ${projectRoot}\n${detail}`
        : `Could not verify local git core.hooksPath is unset in ${projectRoot}\n${detail}`
    );
  }
}

/**
 * Purrfold owns Git initialization so every generated app starts from the same
 * reviewable state: local `main`, no commit, and no staged/tracked/deleted files.
 */
function assertRepositoryInvariant(projectRoot, huskyShouldBeActive) {
  assertPath(projectRoot, '.git');

  const branch = runProcess('git', ['symbolic-ref', '--short', 'HEAD'], {
    cwd: projectRoot,
  });
  if (branch.status !== 0 || branch.stdout.trim() !== 'main') {
    throw new Error(`Expected an unborn main branch in ${projectRoot}\n${branch.output}`);
  }

  const head = runProcess('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: projectRoot,
  });
  if (head.status === 0) {
    throw new Error(`Generated repository should not contain a commit in ${projectRoot}`);
  }

  const indexed = runProcess('git', ['ls-files', '--cached', '--deleted'], {
    cwd: projectRoot,
  });
  if (indexed.status !== 0 || indexed.stdout.trim() !== '') {
    throw new Error(`Generated repository index should be empty in ${projectRoot}\n${indexed.output}`);
  }

  if (huskyShouldBeActive) {
    assertHuskyActive(projectRoot);
  } else {
    assertHuskyInactive(projectRoot);
  }
}

function runMotionImportCheck(projectRoot, env, nodeExecutable) {
  const result = runProcess(nodeExecutable, ['--input-type=module', '--eval', "import('motion/react')"], {
    cwd: projectRoot,
    env,
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`Motion React import failed in ${projectRoot}\n${result.output}`);
  }
}

export function assertGeneratedApp(projectRoot, expected) {
  const framework = expected.framework ?? 'next';
  const packageJson = readJson(path.join(projectRoot, 'package.json'));
  const eslintConfig = readFileSync(path.join(projectRoot, 'eslint.config.mjs'), 'utf8');
  const doctorConfig = readJson(path.join(projectRoot, 'doctor.config.json'));
  const skillsScript = readFileSync(path.join(projectRoot, 'skills.sh'), 'utf8');
  const readme = readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
  const agents = readFileSync(path.join(projectRoot, 'AGENTS.md'), 'utf8');
  const claude = readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf8');

  assertPath(projectRoot, 'DESIGN.md');
  assertPath(projectRoot, '.claude/hooks/react-doctor.ps1');
  assertPath(projectRoot, '.claude/hooks/project-min-evaluation.ps1');
  assertPath(projectRoot, '.claude/settings.json');
  assertPath(projectRoot, '.claude/skills');
  assertIncludes(readme, '## Quality', 'README.md');
  assertIncludes(readme, '## Agent Docs', 'README.md');
  assertIncludes(readme, '## shadcn MCP', 'README.md');
  assertIncludes(agents, '## Quality Gates', 'AGENTS.md');
  assertIncludes(agents, '## References', 'AGENTS.md');
  assertIncludes(agents, '## shadcn MCP', 'AGENTS.md');
  if (packageJson.scripts?.['doctor:design'] !== 'react-doctor design . --yes --blocking warning') {
    throw new Error(
      'package.json should invoke the React Doctor design subcommand separately from the routine quality gate'
    );
  }
  assertNotIncludes(packageJson.scripts?.check ?? '', 'doctor:design', 'package.json check script');
  assertNotIncludes(packageJson.scripts?.['doctor:ci'] ?? '', '--design', 'package.json doctor:ci script');
  assertNotIncludes(eslintConfig, 'reactDoctor.configs.all', 'eslint.config.mjs');

  const doctorIgnoredFiles = doctorConfig.ignore?.files ?? [];
  for (const ignoredPath of [
    '.agents/**',
    '.claude/**',
    framework === 'astro' ? 'src/components/ui/**' : 'components/ui/**',
  ]) {
    if (!doctorIgnoredFiles.includes(ignoredPath)) {
      throw new Error(`doctor.config.json should ignore ${ignoredPath}`);
    }
  }

  const expectedUtilsPath = framework === 'astro' ? 'src/lib/utils.ts' : 'lib/utils.ts';
  if (!doctorConfig.ignore?.overrides?.some((override) => override.files?.includes(expectedUtilsPath))) {
    throw new Error(`doctor.config.json should preserve the ${expectedUtilsPath} override`);
  }

  if (framework === 'astro' && doctorConfig.ignore?.rules?.includes('deslop/unused-dev-dependency')) {
    throw new Error('Astro doctor.config.json should analyze unused development dependencies');
  }

  for (const dependency of ['react-doctor', 'eslint-plugin-react-doctor']) {
    const installed = packageJson.devDependencies?.[dependency];
    if (expected.skipInstall) {
      if (installed) throw new Error(`${dependency} should not be installed with --skip-install`);
    } else if (!installed?.includes(generatedVersions.dependencies[dependency])) {
      throw new Error(`${dependency} should be pinned to ${generatedVersions.dependencies[dependency]}`);
    }
  }

  if (expected.motion) {
    const motionVersion = generatedVersions.dependencies.motion;
    if (!packageJson.dependencies?.motion?.includes(motionVersion)) {
      throw new Error(`package.json should include Motion ${motionVersion} as a runtime dependency`);
    }
    assertIncludes(skillsScript, 'freshtechbro/claudedesignskills', 'skills.sh');
    assertIncludes(skillsScript, '--skill motion-framer', 'skills.sh');
    const motionComponent =
      framework === 'astro' ? 'src/components/common/motion-main.tsx' : 'components/common/motion-main.tsx';
    const globalStylesheet = framework === 'astro' ? 'src/styles/global.css' : 'app/globals.css';
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
      framework === 'astro' ? 'src/components/common/motion-main.tsx' : 'components/common/motion-main.tsx',
      false
    );
  }

  if (framework === 'astro') {
    const tsconfig = readJson(path.join(projectRoot, 'tsconfig.json'));
    const astroConfig = readFileSync(path.join(projectRoot, 'astro.config.mjs'), 'utf8');

    // create-astro's --add react step can fail while create-astro still exits 0;
    // the generated app must always end up with the React integration in place.
    if (!packageJson.dependencies?.['@astrojs/react']) {
      throw new Error('Astro package.json should include @astrojs/react as a runtime dependency');
    }
    assertIncludes(astroConfig, 'react(', 'astro.config.mjs');

    assertPath(projectRoot, 'src/components/ui/button.tsx');
    assertPath(projectRoot, 'src/lib/utils.ts');
    assertPath(projectRoot, 'src/styles/global.css');
    assertPath(projectRoot, 'src/components/home-hero.tsx');
    assertPath(projectRoot, 'src/components/Button.astro', false);
    assertPath(projectRoot, 'src/pages/index.astro');
    assertPath(projectRoot, 'src/layouts/main.astro');
    assertIncludes(eslintConfig, "'src/components/ui/**'", 'eslint.config.mjs');

    if (tsconfig.compilerOptions?.paths?.['@/*']?.[0] !== './src/*') {
      throw new Error('tsconfig.json should map @/* to ./src/*');
    }
    if (packageJson.dependencies?.['@astrojs/mdx'] || packageJson.dependencies?.['canvas-confetti']) {
      throw new Error('Astro starter-only dependencies should be removed');
    }
    assertIncludes(packageJson.scripts?.doctor ?? '', 'astro check && react-doctor', 'Astro doctor script');
    assertIncludes(packageJson.scripts?.['doctor:ci'] ?? '', 'astro check && react-doctor', 'Astro doctor:ci script');
    assertIncludes(eslintConfig, '...reactDoctor.configs.recommended', 'eslint.config.mjs');
    assertIncludes(agents, 'astro dev --background', 'AGENTS.md');
    if (readme.indexOf('<!-- BEGIN:purrfold-managed -->') <= 0) {
      throw new Error('Astro README.md should preserve starter content before the Purrfold block');
    }
    if (agents.indexOf('<!-- BEGIN:purrfold-managed -->') <= 0) {
      throw new Error('Astro AGENTS.md should preserve starter content before the Purrfold block');
    }
    if (
      countOccurrences(readme, '<!-- BEGIN:purrfold-managed -->') !== 1 ||
      countOccurrences(readme, '<!-- END:purrfold-managed -->') !== 1 ||
      countOccurrences(agents, '<!-- BEGIN:purrfold-managed -->') !== 1 ||
      countOccurrences(agents, '<!-- END:purrfold-managed -->') !== 1
    ) {
      throw new Error('Astro Markdown files should contain exactly one Purrfold managed block');
    }
    if (process.platform !== 'win32') {
      const claudePath = path.join(projectRoot, 'CLAUDE.md');
      if (!lstatSync(claudePath).isSymbolicLink() || readlinkSync(claudePath) !== 'AGENTS.md') {
        throw new Error('Astro CLAUDE.md should remain a relative symlink to AGENTS.md');
      }
    }
    if (claude !== agents) {
      throw new Error('Astro CLAUDE.md should resolve to the updated AGENTS.md content');
    }

    if (expected.ssrAdapter) {
      assertIncludes(astroConfig, "output: 'server'", 'astro.config.mjs');
      assertIncludes(astroConfig, `@astrojs/${expected.ssrAdapter}`, 'astro.config.mjs');
    } else {
      assertNotIncludes(astroConfig, "output: 'server'", 'astro.config.mjs');
    }
  } else {
    assertPath(projectRoot, 'components/ui/button.tsx');
    assertPath(projectRoot, 'lib/utils.ts');
    assertPath(projectRoot, 'app/globals.css');
    assertIncludes(eslintConfig, "'components/ui/**'", 'eslint.config.mjs');
    assertIncludes(readme, 'shadcn MCP', 'README.md');
    assertIncludes(agents, 'shadcn MCP', 'AGENTS.md');
    assertNotIncludes(readme, '<!-- BEGIN:purrfold-managed -->', 'README.md');
    assertNotIncludes(agents, '<!-- BEGIN:purrfold-managed -->', 'AGENTS.md');
    if (claude !== '@AGENTS.md\n') {
      throw new Error('Next.js CLAUDE.md should contain exactly @AGENTS.md followed by LF');
    }
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
    assertPath(projectRoot, 'commitlint.config.mjs');
    assertPath(projectRoot, '.husky/commit-msg');
  } else {
    assertPath(projectRoot, 'commitlint.config.mjs', false);
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
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
    } catch {
      // process tree already gone
    }
  }
}

const EXTERNAL_SHADCN_TIMEOUT_MS = 20 * 60 * 1000;

/**
 * Drive purrfold's own interactive prompts inside a pseudo-terminal. Each entry
 * in `scenario.interactions` fires once the first time its `waitFor` marker
 * appears in the output, answering that prompt. Prompt-driven (not blind-timed)
 * so slow environments like CI runners cannot desynchronize the answers; an
 * unanticipated new prompt makes the scenario time out and fail, which is the
 * signal that the interaction script needs updating.
 */
function runInteractivePtyScenario(pty, scenario, context, cliPath, options) {
  const targetName = `${options.prefix ?? 'e2e'}-${scenario.name}-${context.stamp}`;
  const interactions = (scenario.interactions ?? []).map((interaction) => ({
    ...interaction,
    fired: false,
  }));

  return new Promise((resolve, reject) => {
    const child = pty.spawn(context.nodeExecutable, [cliPath, targetName, ...scenario.args], {
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

    child.onData((data) => {
      output += data;
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
    const child = pty.spawn(context.nodeExecutable, [cliPath, targetName, ...scenario.args], {
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
          assertRepositoryInvariant(projectRoot, true);
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
    throw new Error(
      `${scenario.name} requires node-pty. Install dev dependency node-pty when registry access is available.`
    );
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
  const requires = scenario.execution?.requires ?? [];
  for (const command of requires.filter((command) => command !== 'pnpm')) {
    if (!hasCommand(command)) {
      throw new Error(`${scenario.name} requires ${command} on PATH`);
    }
  }
  const scenarioContext = prepareScenarioContext(scenario, context, options);

  if (scenario.requiresTty) {
    return runTtyScenario(scenario, scenarioContext, cliPath, options);
  }

  const targetName = `${options.prefix ?? 'e2e'}-${scenario.name}-${scenarioContext.stamp}`;
  const args =
    scenario.kind === 'dry-run' ? [cliPath, targetName, ...scenario.args] : [cliPath, targetName, ...scenario.args];
  const result = runProcess(scenarioContext.nodeExecutable, args, {
    cwd: scenarioContext.workDir,
    env: scenarioContext.env,
    input: scenario.input,
    shell: false,
  });

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
    const projectRoot = path.join(scenarioContext.workDir, targetName);
    assertGeneratedApp(projectRoot, {
      ...scenario.expect,
      framework: scenario.framework ?? 'next',
      ssrAdapter: scenario.ssrAdapter,
    });
    assertRepositoryInvariant(projectRoot, !scenario.expect.skipInstall);
    const checkOutput = scenario.expect.skipInstall
      ? ''
      : runGeneratedCheck(projectRoot, scenario.packageManager, scenarioContext.env);
    if (scenario.verifyDoctorDesign) {
      runGeneratedDoctorDesign(projectRoot, scenario.packageManager, scenarioContext.env);
    }
    // The generated app already ran its gate once during creation. This second
    // pass exercises React Doctor's warm-cache path; it must not create a HEAD
    // commit or alter the empty index.
    assertRepositoryInvariant(projectRoot, !scenario.expect.skipInstall);
    if (scenario.expect.commitlint) {
      runCommitlintCheck(projectRoot, scenario.packageManager, scenarioContext.env);
    }
    if (scenario.expect.motion) {
      runMotionImportCheck(projectRoot, scenarioContext.env, scenarioContext.nodeExecutable);
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
