import { getPackageManagerCommands } from '../package-manager.js';
import { getFrameworkAdapter } from '../frameworks/registry.js';
import type { CreateOptions, Executor } from '../types.js';

export async function initializeShadcn(
  projectRoot: string,
  options: Pick<CreateOptions, 'framework' | 'packageManager' | 'yes' | 'shadcnArgs'>,
  executor: Executor
) {
  const commands = getPackageManagerCommands(options.packageManager);
  const adapter = getFrameworkAdapter(options.framework);
  const initArgs = [
    'init',
    ...adapter.shadcnInitArgs(options),
    ...(options.yes ? ['--defaults'] : []),
    ...options.shadcnArgs,
  ];
  const { command, args } = commands.shadcn(initArgs);

  await executor.run(command, args, { cwd: projectRoot });
}
