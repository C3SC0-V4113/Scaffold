import { getPackageManagerCommands } from '../package-manager.js';
import type { CreateOptions, Executor } from '../types.js';

export async function initializeShadcn(
  projectRoot: string,
  options: Pick<CreateOptions, 'packageManager' | 'yes' | 'shadcnArgs'>,
  executor: Executor
) {
  const commands = getPackageManagerCommands(options.packageManager);
  const initArgs = [
    'init',
    ...(options.yes ? ['--defaults'] : []),
    ...options.shadcnArgs,
  ];
  const { command, args } = commands.shadcn(initArgs);

  await executor.run(command, args, { cwd: projectRoot });
}
