import path from 'node:path';

import type { CreateOptions, Executor } from '../types.js';
import { buildScripts } from './config-model.js';

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
  options: Pick<CreateOptions, 'packageManager' | 'unit' | 'e2e'>
) {
  const packageJson = await readProjectPackageJson(projectRoot, executor);

  packageJson.scripts = {
    ...packageJson.scripts,
    ...buildScripts(options),
  };

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
