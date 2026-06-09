import path from 'node:path';

import { getPackageManagerCommands } from '../package-manager.js';
import {
  commitMsgHook,
  commitlintConfig,
  gitAttributes,
  preCommitHook,
  prePushHook,
  prettierConfig,
  prettierIgnore,
  reactDoctorConfig,
  renderHomePage,
  renderQualityWorkflow,
  renderRootLayout,
} from '../templates/files.js';
import { renderEslintConfig } from '../templates/eslint.js';
import type { CreateOptions, Executor } from '../types.js';
import { buildDevDependencies } from './config-model.js';
import { applyPackageJsonQualityConfig } from './package-json.js';

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

async function writeAppShell(projectRoot: string, executor: Executor) {
  const projectName = path.basename(projectRoot);

  await executor.writeFile(
    path.join(projectRoot, 'app', 'layout.tsx'),
    renderRootLayout(projectName)
  );
  await executor.writeFile(path.join(projectRoot, 'app', 'page.tsx'), renderHomePage(projectName));
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

  await writeAppShell(projectRoot, executor);
}
