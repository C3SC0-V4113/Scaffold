import path from 'node:path';

import { getPackageManagerCommands } from '../package-manager.js';
import {
  readProjectPackageJson,
  writeProjectPackageJson,
} from './package-json.js';
import { validateTargetDir } from './next.js';
import { mergePnpmBuildPolicy } from '../templates/files.js';
import type { CreateOptions, Executor } from '../types.js';

export async function createReactRouterApp(
  options: CreateOptions,
  executor: Executor,
) {
  const projectRoot = await validateTargetDir(options.targetDir, executor);
  const commands = getPackageManagerCommands(options.packageManager);
  const create = commands.createReactRouterApp(path.basename(projectRoot));
  await executor.run(create.command, create.args, {
    cwd: path.dirname(projectRoot),
  });

  if (options.packageManager === 'pnpm') {
    await executor.writeFile(
      path.join(projectRoot, 'pnpm-workspace.yaml'),
      mergePnpmBuildPolicy(''),
    );
  }

  return projectRoot;
}

export function renderReactRouterConfig(ssr: boolean) {
  return ssr
    ? `import type { Config } from '@react-router/dev/config';\n\nexport default {\n  ssr: true,\n} satisfies Config;\n`
    : `import type { Config } from '@react-router/dev/config';\n\nexport default {\n  ssr: false,\n  prerender: ['/'],\n} satisfies Config;\n`;
}

export function renderReactRouterScripts(ssr: boolean) {
  return {
    build: 'react-router build',
    dev: 'react-router dev',
    start: ssr ? 'react-router-serve ./build/server/index.js' : 'vite preview',
    typecheck: 'react-router typegen && tsc',
  };
}

export async function configureReactRouter(
  projectRoot: string,
  options: CreateOptions,
  executor: Executor,
) {
  const packageJson = await readProjectPackageJson(projectRoot, executor);
  packageJson.scripts = {
    ...packageJson.scripts,
    ...renderReactRouterScripts(options.ssr),
  };
  await writeProjectPackageJson(projectRoot, executor, packageJson);

  await executor.writeFile(
    path.join(projectRoot, 'react-router.config.ts'),
    renderReactRouterConfig(options.ssr),
  );
}
