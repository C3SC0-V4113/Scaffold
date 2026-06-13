import { createRequire } from 'node:module';

import { Command } from 'commander';

import { cliOptions, cliScenarios, installCommand } from './cli-metadata.js';
import { runCreate } from './commands/create.js';
import type { PackageManager } from './types.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

export function buildProgram(): Command {
  const program = new Command();

  program
    .name('purrfold')
    .description(
      'Scaffold a production-ready frontend app with shadcn, quality tooling, agent docs, and Claude hooks.'
    )
    .version(version, '-v, --version', 'Output the purrfold version');

  program
    .command('create', { isDefault: true })
    .description('Create a new app in <target-dir>')
    .argument('<target-dir>', 'Directory for the generated app')
    .option('--pm <pm>', 'Package manager: npm, pnpm, or bun')
    .option('--unit', 'Install Vitest and React Testing Library')
    .option('--no-unit', 'Skip Vitest and React Testing Library')
    .option('--e2e', 'Install Playwright E2E testing')
    .option('--no-e2e', 'Skip Playwright E2E testing')
    .option('--commitlint', 'Install commitlint and the commit-msg hook')
    .option('--no-commitlint', 'Skip commitlint')
    .option('--yes', 'Use non-interactive defaults')
    .option('--dry-run', 'Print operations without writing files or installing packages')
    .option('--skip-install', 'Generate quality files without installing additional packages')
    .option('--shadcn-args <args...>', 'Additional arguments forwarded to shadcn init')
    .option('--mcp', 'Install shadcn MCP for Claude, Codex, and OpenCode')
    .option('--no-mcp', 'Skip shadcn MCP setup')
    .option('--icons <library>', 'Icon library for the home page: lucide, phosphor, or tabler')
    .action(async (targetDir: string, rawOptions: Record<string, unknown>) => {
      await runCreate(targetDir, {
        pm: rawOptions.pm as PackageManager | undefined,
        unit: rawOptions.unit as boolean | undefined,
        e2e: rawOptions.e2e as boolean | undefined,
        commitlint: rawOptions.commitlint as boolean | undefined,
        yes: rawOptions.yes as boolean | undefined,
        dryRun: rawOptions.dryRun as boolean | undefined,
        skipInstall: rawOptions.skipInstall as boolean | undefined,
        shadcnArgs: rawOptions.shadcnArgs as string[] | undefined,
        mcp: rawOptions.mcp as boolean | undefined,
        icons: rawOptions.icons as string | undefined,
      });
    });

  program
    .command('info')
    .description(
      'Print purrfold options and common scenarios (use --json for a machine-readable schema)'
    )
    .option('--json', 'Output a structured JSON schema (for agents and tooling)')
    .action((options: { json?: boolean }) => {
      if (options.json) {
        const schema = {
          name: 'purrfold',
          version,
          description: program.description(),
          install: installCommand,
          options: cliOptions,
          scenarios: cliScenarios,
        };
        console.log(JSON.stringify(schema, null, 2));
        return;
      }

      console.log(`purrfold v${version}`);
      console.log(`\nInstall:  ${installCommand}\n`);
      console.log('Options:');
      for (const option of cliOptions) {
        console.log(`  ${option.flags}`);
        console.log(`      ${option.description} (default: ${option.default})`);
      }
      console.log('\nCommon scenarios:');
      for (const scenario of cliScenarios) {
        console.log(`  ${scenario.intent}`);
        console.log(`      ${scenario.command}`);
      }
    });

  program.addHelpText(
    'after',
    `\nExamples:\n${cliScenarios
      .map((scenario) => `  # ${scenario.intent}\n  ${scenario.command}`)
      .join('\n\n')}\n`
  );

  return program;
}
