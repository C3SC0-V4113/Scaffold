import path from 'node:path';

import versions from '../versions.json' with { type: 'json' };

import type { CreateOptions, Executor } from '../types.js';
import { buildScripts } from './config-model.js';

/** `packageManager` requires an exact `x.y.z`; ranges and majors are rejected. */
const EXACT_SEMVER = /^\d+\.\d+\.\d+/;

/**
 * Record the pnpm that actually produced the lockfile in `packageManager`, so
 * local and CI agree by construction: pnpm self-manages to this version, and
 * `pnpm/action-setup` reads it instead of needing a `version:` input (passing
 * both makes that action refuse to run).
 *
 * The running pnpm is preferred over the pin in versions.json because writing a
 * version the developer does not have would make pnpm download a different
 * major mid-scaffold — during the installs and `check` purrfold runs itself.
 * The pin is the fallback for when pnpm cannot be probed (dry runs).
 */
export async function resolvePnpmPackageManager(
  executor: Executor
): Promise<string | undefined> {
  const detected = await executor.capture('pnpm', ['--version']);
  const version = detected && EXACT_SEMVER.test(detected) ? detected : versions.toolchain.pnpm;

  return EXACT_SEMVER.test(version) ? `pnpm@${version}` : undefined;
}

export interface ProjectPackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  'lint-staged'?: Record<string, string | string[]>;
  overrides?: Record<string, string>;
  [key: string]: unknown;
}

export async function readProjectPackageJson(
  projectRoot: string,
  executor: Executor
): Promise<ProjectPackageJson> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!(await executor.pathExists(packageJsonPath))) {
    return {
      name: path.basename(projectRoot),
      version: '0.1.0',
      private: true,
      scripts: {},
    };
  }

  const content = await executor.readFile(packageJsonPath);
  return JSON.parse(content) as ProjectPackageJson;
}

export async function writeProjectPackageJson(
  projectRoot: string,
  executor: Executor,
  packageJson: ProjectPackageJson
) {
  await executor.writeJson(path.join(projectRoot, 'package.json'), packageJson);
}

export async function applyPackageJsonQualityConfig(
  projectRoot: string,
  executor: Executor,
  options: Pick<CreateOptions, 'framework' | 'packageManager' | 'unit' | 'e2e'>
) {
  const packageJson = await readProjectPackageJson(projectRoot, executor);

  packageJson.scripts = {
    ...packageJson.scripts,
    ...buildScripts(options),
  };

  // pnpm only: npm ships with Node (already pinned by setup-node), and bun is
  // not corepack-managed, so neither has the local/CI drift this solves.
  if (options.packageManager === 'pnpm') {
    const packageManager = await resolvePnpmPackageManager(executor);
    if (packageManager) {
      packageJson.packageManager = packageManager;
    }
  }

  packageJson['lint-staged'] = {
    '*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}': [
      'eslint --fix --no-warn-ignored --max-warnings 0',
      'prettier --write',
    ],
    '*.{json,md,mdx,css,scss,html,yml,yaml}': 'prettier --write',
  };

  if (packageJson.overrides) {
    const overrides = { ...packageJson.overrides };
    delete overrides['eslint-config-prettier'];
    delete overrides['eslint-plugin-prettier'];

    if (Object.keys(overrides).length > 0) {
      packageJson.overrides = overrides;
    } else {
      delete packageJson.overrides;
    }
  }

  await writeProjectPackageJson(projectRoot, executor, packageJson);
}
