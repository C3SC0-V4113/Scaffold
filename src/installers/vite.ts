import path from 'node:path';

import { DryRunExecutor } from '../executor.js';
import { getPackageManagerCommands } from '../package-manager.js';
import { mergePnpmBuildPolicy } from '../templates/files.js';
import type { CreateOptions, Executor } from '../types.js';
import { pinnedSpecifier } from './config-model.js';
import { validateTargetDir } from './next.js';

const viteStarterDependencies = [
  'vite',
  '@vitejs/plugin-react',
  'tailwindcss',
  '@tailwindcss/vite',
] as const;

export function addVitePathAliases(tsconfig: string) {
  const compilerOptions = /"compilerOptions"\s*:\s*\{/;
  if (!compilerOptions.test(tsconfig)) {
    if (!/^\s*\{/.test(tsconfig)) {
      throw new Error('Expected a create-vite TypeScript config to be a JSON object.');
    }

    return tsconfig.replace(
      /^\s*\{/,
      (openingBrace) =>
        `${openingBrace}\n  "compilerOptions": {\n    "paths": {\n      "@/*": ["./src/*"]\n    }\n  },`,
    );
  }
  if (/"(?:baseUrl|paths)"\s*:/.test(tsconfig)) {
    throw new Error(
      'Expected a fresh create-vite TypeScript config without existing baseUrl or paths options.',
    );
  }

  return tsconfig.replace(
    compilerOptions,
    '"compilerOptions": {\n    "paths": {\n      "@/*": ["./src/*"]\n    },',
  );
}

export function addViteTypecheckCoverage(
  tsconfigApp: string,
  tsconfigNode: string,
  options: Pick<CreateOptions, 'unit' | 'e2e'>,
) {
  const appInclude = options.unit || options.e2e
    ? '"include": ["src", "tests"]'
    : '"include": ["src"]';
  if (!/"include"\s*:\s*\[\s*"src"\s*\]/.test(tsconfigApp)) {
    throw new Error('Expected a fresh create-vite app config with only src included.');
  }

  const nodeIncludes = [
    'vite.config.ts',
    ...(options.unit ? ['vitest.config.ts'] : []),
    ...(options.e2e ? ['playwright.config.ts'] : []),
  ];
  if (!/"include"\s*:\s*\[\s*"vite.config.ts"\s*\]/.test(tsconfigNode)) {
    throw new Error('Expected a fresh create-vite node config with only vite.config.ts included.');
  }

  return {
    app: tsconfigApp.replace(/"include"\s*:\s*\[\s*"src"\s*\]/, appInclude),
    node: tsconfigNode.replace(
      /"include"\s*:\s*\[\s*"vite.config.ts"\s*\]/,
      `"include": ${JSON.stringify(nodeIncludes)}`,
    ),
  };
}

export const viteConfig = `import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
});
`;

async function configureViteProject(
  projectRoot: string,
  options: CreateOptions,
  executor: Executor,
) {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.app.json');
  const rootTsconfigPath = path.join(projectRoot, 'tsconfig.json');
  const nodeTsconfigPath = path.join(projectRoot, 'tsconfig.node.json');
  const configPath = path.join(projectRoot, 'vite.config.ts');
  const stylesheetPath = path.join(projectRoot, 'src', 'index.css');

  if (executor instanceof DryRunExecutor) {
    await executor.writeFile(tsconfigPath);
    await executor.writeFile(rootTsconfigPath);
    await executor.writeFile(nodeTsconfigPath);
    await executor.writeFile(configPath);
    await executor.writeFile(stylesheetPath);
    return;
  }

  for (const filePath of [tsconfigPath, rootTsconfigPath, nodeTsconfigPath, configPath, stylesheetPath]) {
    if (!(await executor.pathExists(filePath))) {
      throw new Error(
        `Expected create-vite to create ${path.relative(projectRoot, filePath)}.`,
      );
    }
  }

  await executor.writeFile(
    tsconfigPath,
    addVitePathAliases(await executor.readFile(tsconfigPath)),
  );
  await executor.writeFile(
    rootTsconfigPath,
    addVitePathAliases(await executor.readFile(rootTsconfigPath)),
  );
  const typecheckConfigs = addViteTypecheckCoverage(
    await executor.readFile(tsconfigPath),
    await executor.readFile(nodeTsconfigPath),
    options,
  );
  await executor.writeFile(tsconfigPath, typecheckConfigs.app);
  await executor.writeFile(nodeTsconfigPath, typecheckConfigs.node);
  await executor.writeFile(configPath, viteConfig);
  await executor.writeFile(stylesheetPath, '@import "tailwindcss";\n');
}

export async function createViteApp(
  options: CreateOptions,
  executor: Executor,
) {
  const projectRoot = await validateTargetDir(options.targetDir, executor);
  const commands = getPackageManagerCommands(options.packageManager);
  // create-vite resolves an absolute target as a relative path on some package
  // manager launchers. Run it from the target's parent with only its basename.
  const create = commands.createViteApp(path.basename(projectRoot));

  await executor.run(create.command, create.args, { cwd: path.dirname(projectRoot) });

  if (options.packageManager === 'pnpm') {
    const workspacePath = path.join(projectRoot, 'pnpm-workspace.yaml');
    const existing = (await executor.pathExists(workspacePath))
      ? await executor.readFile(workspacePath)
      : '';
    await executor.writeFile(workspacePath, mergePnpmBuildPolicy(existing));
  }

  const install = commands.addDev(
    viteStarterDependencies.map((name) => pinnedSpecifier(name, 'vite')),
  );
  await executor.run(install.command, install.args, { cwd: projectRoot });
  if (options.router !== 'none') {
    const routerInstall = commands.add([pinnedSpecifier('react-router')]);
    await executor.run(routerInstall.command, routerInstall.args, { cwd: projectRoot });
  }
  await configureViteProject(projectRoot, options, executor);

  return projectRoot;
}
