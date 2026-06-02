import path from 'node:path';

import { getPackageManagerCommands } from '../package-manager.js';
import type { CreateOptions, Executor } from '../types.js';

export function resolveTargetDir(targetDir: string) {
  return path.resolve(process.cwd(), targetDir);
}

export async function validateTargetDir(targetDir: string, executor: Executor) {
  const absoluteTargetDir = path.resolve(process.cwd(), targetDir);
  const baseName = path.basename(absoluteTargetDir);

  if (!baseName || baseName === '.' || baseName === '..') {
    throw new Error('Provide a valid project directory name.');
  }

  if (await executor.pathExists(absoluteTargetDir)) {
    const markerPath = path.join(absoluteTargetDir, 'package.json');
    if (await executor.pathExists(markerPath)) {
      throw new Error(`Target directory already contains a package.json: ${absoluteTargetDir}`);
    }
  }

  return absoluteTargetDir;
}

export async function createNextApp(options: CreateOptions, executor: Executor) {
  const projectRoot = await validateTargetDir(options.targetDir, executor);
  const commands = getPackageManagerCommands(options.packageManager);
  const { command, args } = commands.createNextApp(options.targetDir, options.yes);

  await executor.run(command, args);

  return projectRoot;
}
