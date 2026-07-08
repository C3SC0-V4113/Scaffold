import path from 'node:path';

import { getPackageManagerCommands } from '../package-manager.js';
import {
  commitMsgHook,
  commitlintConfig,
  astroRootLayout,
  gitAttributes,
  mergePnpmHardening,
  preCommitHook,
  prePushHook,
  prettierConfig,
  prettierIgnore,
  reactDoctorConfig,
  renderAstroHomeHero,
  renderAstroHomePage,
  renderHomePage,
  renderQualityWorkflow,
  renderRootLayout,
} from '../templates/files.js';
import { renderEslintConfig } from '../templates/eslint.js';
import {
  iconPackages,
  knownIconPackages,
  resolveIconLibrary,
} from '../templates/icons.js';
import type { CreateOptions, Executor, IconLibrary } from '../types.js';
import { buildDevDependencies, pinnedSpecifier } from './config-model.js';
import { applyPackageJsonQualityConfig, readProjectPackageJson } from './package-json.js';

function runCommand(packageManager: string) {
  return packageManager === 'npm' ? 'npm run' : `${packageManager} run`;
}

function execCommand(packageManager: string, binary: string) {
  if (packageManager === 'pnpm') {
    return `pnpm exec ${binary}`;
  }

  if (packageManager === 'bun') {
    return `bunx --bun ${binary}`;
  }

  return `npx ${binary}`;
}

function renderPreCommitHook(packageManager: string) {
  return preCommitHook
    .replace('npx lint-staged', execCommand(packageManager, 'lint-staged'))
    .replace('npm run doctor:staged', `${runCommand(packageManager)} doctor:staged`);
}

function renderPrePushHook(packageManager: string) {
  return prePushHook.replace('npm run check', `${runCommand(packageManager)} check`);
}

function renderCommitMsgHook(packageManager: string) {
  return commitMsgHook.replace('npx commitlint', execCommand(packageManager, 'commitlint'));
}

async function appendGitIgnore(projectRoot: string, executor: Executor) {
  const gitIgnorePath = path.join(projectRoot, '.gitignore');
  const additions = ['.claude/skills/', '.react-scan/', 'playwright-report/', 'test-results/'];
  const current = (await executor.pathExists(gitIgnorePath))
    ? await executor.readFile(gitIgnorePath)
    : '';
  const nextLines = current.trimEnd().split(/\r?\n/).filter(Boolean);

  for (const addition of additions) {
    if (!nextLines.includes(addition)) {
      nextLines.push(addition);
    }
  }

  await executor.writeFile(gitIgnorePath, `${nextLines.join('\n')}\n`);
}

async function detectIconLibrary(
  projectRoot: string,
  executor: Executor
): Promise<string | undefined> {
  const componentsPath = path.join(projectRoot, 'components.json');
  if (!(await executor.pathExists(componentsPath))) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(await executor.readFile(componentsPath)) as { iconLibrary?: string };
    return parsed.iconLibrary;
  } catch {
    return undefined;
  }
}

/**
 * Land on a supported icon library (lucide/phosphor/tabler): keep shadcn's
 * choice when supported, otherwise normalize to lucide. Ensure exactly that
 * package is installed and remove any other icon package shadcn pulled in, so
 * the home genuinely uses its dependency and nothing is left unused.
 */
async function reconcileIconLibrary(
  projectRoot: string,
  options: CreateOptions,
  executor: Executor
): Promise<IconLibrary> {
  const detected = await detectIconLibrary(projectRoot, executor);
  const effective = resolveIconLibrary(options.icons, detected);

  if (options.dryRun || options.skipInstall) {
    return effective;
  }

  const keep = iconPackages[effective];
  const packageJson = await readProjectPackageJson(projectRoot, executor);
  const dependencies = { ...(packageJson.dependencies ?? {}) };
  const toRemove = knownIconPackages.filter((name) => name in dependencies && name !== keep);

  const commands = getPackageManagerCommands(options.packageManager);

  if (!(keep in dependencies)) {
    const add = commands.add([pinnedSpecifier(keep)]);
    await executor.run(add.command, add.args, { cwd: projectRoot });
  }

  if (toRemove.length > 0) {
    const remove = commands.remove(toRemove);
    await executor.run(remove.command, remove.args, { cwd: projectRoot });
  }

  if (detected && detected !== effective) {
    const componentsPath = path.join(projectRoot, 'components.json');
    if (await executor.pathExists(componentsPath)) {
      const parsed = JSON.parse(await executor.readFile(componentsPath)) as Record<string, unknown>;
      parsed.iconLibrary = effective;
      await executor.writeJson(componentsPath, parsed);
    }
    console.warn(
      options.icons
        ? `Using the requested icon library "${effective}" (shadcn was set to "${detected}").`
        : `Icon library "${detected}" is not supported; using "${effective}" for the home page instead.`
    );
  }

  return effective;
}

async function writeAppShell(
  projectRoot: string,
  executor: Executor,
  iconLibrary: IconLibrary,
  framework: CreateOptions['framework']
) {
  const projectName = path.basename(projectRoot);

  if (framework === 'astro') {
    await executor.writeFile(
      path.join(projectRoot, 'src', 'components', 'home-hero.tsx'),
      renderAstroHomeHero(projectName, iconLibrary)
    );
    await executor.writeFile(
      path.join(projectRoot, 'src', 'pages', 'index.astro'),
      renderAstroHomePage(projectName)
    );
    await executor.writeFile(path.join(projectRoot, 'src', 'layouts', 'main.astro'), astroRootLayout);
    return;
  }

  await executor.writeFile(
    path.join(projectRoot, 'app', 'layout.tsx'),
    renderRootLayout(projectName)
  );
  await executor.writeFile(
    path.join(projectRoot, 'app', 'page.tsx'),
    renderHomePage(projectName, iconLibrary)
  );
}

export async function installQualityLayer(
  projectRoot: string,
  options: CreateOptions,
  executor: Executor
) {
  await applyPackageJsonQualityConfig(projectRoot, executor, options);

  await executor.writeFile(path.join(projectRoot, 'eslint.config.mjs'), renderEslintConfig(options));
  await executor.writeFile(path.join(projectRoot, '.prettierrc'), prettierConfig);
  await executor.writeFile(path.join(projectRoot, '.prettierignore'), prettierIgnore);
  await executor.writeFile(path.join(projectRoot, '.gitattributes'), gitAttributes);
  await executor.writeFile(path.join(projectRoot, 'doctor.config.json'), reactDoctorConfig);
  await appendGitIgnore(projectRoot, executor);

  await executor.writeFile(
    path.join(projectRoot, '.husky', 'pre-commit'),
    renderPreCommitHook(options.packageManager)
  );
  await executor.writeFile(
    path.join(projectRoot, '.husky', 'pre-push'),
    renderPrePushHook(options.packageManager)
  );

  if (options.commitlint) {
    await executor.writeFile(path.join(projectRoot, 'commitlint.config.js'), commitlintConfig);
    await executor.writeFile(
      path.join(projectRoot, '.husky', 'commit-msg'),
      renderCommitMsgHook(options.packageManager)
    );
  }

  await executor.writeFile(
    path.join(projectRoot, '.github', 'workflows', 'quality.yml'),
    renderQualityWorkflow(options.packageManager)
  );

  if (!options.skipInstall) {
    const commands = getPackageManagerCommands(options.packageManager);
    const install = commands.addDev(buildDevDependencies(options));
    await executor.run(install.command, install.args, { cwd: projectRoot });
  }

  const iconLibrary = await reconcileIconLibrary(projectRoot, options, executor);
  await writeAppShell(projectRoot, executor, iconLibrary, options.framework);

  // pnpm-only: React Doctor 0.5.x requires supply-chain hardening in
  // pnpm-workspace.yaml. Written last so it never gates the installs above.
  if (options.packageManager === 'pnpm') {
    const workspacePath = path.join(projectRoot, 'pnpm-workspace.yaml');
    const existing = (await executor.pathExists(workspacePath))
      ? await executor.readFile(workspacePath)
      : '';
    await executor.writeFile(workspacePath, mergePnpmHardening(existing));
  }
}
