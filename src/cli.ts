import { createRequire } from 'node:module';

import { Command } from 'commander';

import { cliOptions, cliScenarios, installCommand } from './cli-metadata.js';
import { runCreate } from './commands/create.js';
import { frameworkRegistry } from './frameworks/registry.js';
import type { Framework, PackageManager } from './types.js';

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
    .option('--framework <framework>', 'Framework: next, astro, vite, or react-router')
    .option('--router <none|react-router-data|react-router-declarative>', 'Vite router mode')
    .option('--ssr', 'Enable server-side rendering when supported')
    .option('--no-ssr', 'Disable server-side rendering when supported')
    .option('--adapter <node|vercel|netlify|cloudflare>', 'Astro SSR adapter')
    .option('--unit', 'Install Vitest and React Testing Library')
    .option('--no-unit', 'Skip Vitest and React Testing Library')
    .option('--e2e', 'Install Playwright E2E testing')
    .option('--no-e2e', 'Skip Playwright E2E testing')
    .option('--commitlint', 'Install commitlint and the commit-msg hook')
    .option('--no-commitlint', 'Skip commitlint')
    .option('--ci', 'Install GitHub Actions workflows')
    .option('--no-ci', 'Skip GitHub Actions workflows')
    .option('--motion', 'Install Motion for React and the motion-framer agent skill')
    .option('--query', 'Install TanStack Query and the tanstack-query agent skill')
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
        framework: rawOptions.framework as Framework | undefined,
        router: rawOptions.router as string | undefined,
        ssr: rawOptions.ssr as boolean | undefined,
        adapter: rawOptions.adapter as string | undefined,
        unit: rawOptions.unit as boolean | undefined,
        e2e: rawOptions.e2e as boolean | undefined,
        commitlint: rawOptions.commitlint as boolean | undefined,
        ci: rawOptions.ci as boolean | undefined,
        motion: rawOptions.motion as boolean | undefined,
        query: rawOptions.query as boolean | undefined,
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
          frameworks: frameworkRegistry.map((adapter) => ({
            id: adapter.id,
            routers: adapter.capabilities.routers,
            defaultRouter: adapter.capabilities.defaultRouter ?? 'none',
            rendering: adapter.capabilities.rendering
              ? { ssr: adapter.capabilities.rendering.ssr, defaultSsr: adapter.capabilities.rendering.defaultSsr }
              : null,
          })),
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
