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
      // Wiring an MCP client is a convenience around a third-party CLI that
      // hits the network; the generated app works without it. Aborting here
      // used to take down everything that runs afterwards — the formatting
      // normalization and the self-check — leaving a project that fails its
      // own `check` (issue #90). Report it and keep going.
      const renderedCommand = [command, ...args].join(' ');
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Skipped shadcn MCP setup for ${client}: ${renderedCommand} failed.\n${message}\n` +
          `Run it yourself inside the project to finish wiring ${client}.`
      );
    }
  }
}
