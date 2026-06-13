import { getPackageManagerCommands } from '../package-manager.js';
import type { CreateOptions, Executor, ShadcnMcpClient } from '../types.js';

export const shadcnMcpClients: ShadcnMcpClient[] = ['claude', 'codex', 'opencode'];

export async function installShadcnMcp(
  projectRoot: string,
  options: Pick<CreateOptions, 'packageManager' | 'mcp'>,
  executor: Executor
) {
  if (!options.mcp) {
    return;
  }

  const commands = getPackageManagerCommands(options.packageManager);

  for (const client of shadcnMcpClients) {
    const { command, args } = commands.shadcnMcp(client);
    try {
      await executor.run(command, args, { cwd: projectRoot });
    } catch (error) {
      const renderedCommand = [command, ...args].join(' ');
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize shadcn MCP with: ${renderedCommand}\n${message}`);
    }
  }
}
