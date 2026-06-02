import path from 'node:path';

import { getPackageManagerCommands } from '../package-manager.js';
import {
  commitMsgHook,
  commitlintConfig,
  preCommitHook,
  prePushHook,
  prettierConfig,
  prettierIgnore,
  reactDoctorConfig,
  renderQualityWorkflow,
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

async function injectReactScanScript(projectRoot: string, executor: Executor) {
  const layoutPath = path.join(projectRoot, 'app', 'layout.tsx');
  if (!(await executor.pathExists(layoutPath))) {
    return;
  }

  const layout = await executor.readFile(layoutPath);
  if (layout.includes('react-scan') || layout.includes('auto.global.js')) {
    return;
  }

  const importLine = "import Script from 'next/script';\n";
  const withImport = layout.includes("from 'next/script'")
    ? layout
    : layout.replace(/(import[\s\S]+?;\n)/, `$1${importLine}`);
  const script = `{process.env.NODE_ENV === 'development' ? (
        <Script
          src="https://unpkg.com/react-scan/dist/auto.global.js"
          strategy="afterInteractive"
        />
      ) : null}
      `;
  const withScript = withImport.replace(/(<body[^>]*>)(\s*)/, `$1$2${script}`);

  await executor.writeFile(layoutPath, withScript);
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
  await executor.writeFile(path.join(projectRoot, 'react-doctor.config.json'), reactDoctorConfig);
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

    const scanInit = commands.exec('react-scan', ['init', '-y', '--skip-install']);
    try {
      await executor.run(scanInit.command, scanInit.args, { cwd: projectRoot });
    } catch (error) {
      console.warn(`react-scan init failed; falling back to layout injection. ${String(error)}`);
    }
  }

  await injectReactScanScript(projectRoot, executor);
}
