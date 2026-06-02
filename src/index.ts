#!/usr/bin/env node
import { Command } from 'commander';

import { runCreate } from './commands/create.js';
import type { PackageManager } from './types.js';

const program = new Command();

program
  .name('scaffold-next-quality')
  .description('Create a latest Next.js app with shadcn, quality tooling, skills, docs, and hooks.')
  .argument('<target-dir>', 'Directory for the generated Next.js app')
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
    });
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
