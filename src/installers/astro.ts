import type { CreateOptions, Executor } from '../types.js';
import { validateTargetDir } from './next.js';

const createAstroBaseArgs = [
  '--template',
  'with-tailwindcss',
  '--install',
  '--add',
  'react',
  '--git',
];

function assertAstroPackageManager(packageManager: CreateOptions['packageManager']) {
  if (packageManager === 'bun') {
    throw new Error('Astro scaffolding is not available with bun yet. Use npm or pnpm.');
  }
}

export async function createAstroApp(options: CreateOptions, executor: Executor) {
  assertAstroPackageManager(options.packageManager);

  const projectRoot = await validateTargetDir(options.targetDir, executor);
  const command = options.packageManager === 'pnpm' ? 'pnpm' : 'npm';
  const args = [
    'create',
    'astro@latest',
    options.targetDir,
    '--',
    ...createAstroBaseArgs,
    ...(options.yes ? ['--yes'] : []),
  ];

  await executor.run(command, args);

  return projectRoot;
}
