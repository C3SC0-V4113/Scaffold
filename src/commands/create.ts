import { confirm, select } from '@inquirer/prompts';

import { DryRunExecutor, RealExecutor } from '../executor.js';
import { installDocsAndClaude } from '../installers/docs.js';
import { createNextApp } from '../installers/next.js';
import { installQualityLayer } from '../installers/quality.js';
import { installShadcnMcp } from '../installers/shadcn-mcp.js';
import { initializeShadcn } from '../installers/shadcn.js';
import { installSkills } from '../installers/skills.js';
import { installTestingFiles } from '../installers/testing.js';
import { supportedIconLibraries } from '../templates/icons.js';
import type { CreateOptions, IconLibrary, PackageManager } from '../types.js';

export interface RawCreateFlags {
  pm?: PackageManager;
  unit?: boolean;
  e2e?: boolean;
  commitlint?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  skipInstall?: boolean;
  shadcnArgs?: string[];
  mcp?: boolean;
  icons?: string;
}

const packageManagers = ['npm', 'pnpm', 'bun'] as const;

export function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent ?? '';
  const detected = packageManagers.find((packageManager) =>
    userAgent.startsWith(`${packageManager}/`)
  );

  return detected ?? 'npm';
}

function assertPackageManager(packageManager: string): asserts packageManager is PackageManager {
  if (!packageManagers.includes(packageManager as PackageManager)) {
    throw new Error(`Unsupported package manager "${packageManager}". Use npm, pnpm, or bun.`);
  }
}

function resolveIconOption(icons: string | undefined): IconLibrary | undefined {
  if (icons === undefined) {
    return undefined;
  }

  if (!supportedIconLibraries.includes(icons as IconLibrary)) {
    throw new Error(
      `Unsupported icon library "${icons}". Use ${supportedIconLibraries.join(', ')}.`
    );
  }

  return icons as IconLibrary;
}

async function resolvePackageManager(flags: RawCreateFlags): Promise<PackageManager> {
  if (flags.pm) {
    assertPackageManager(flags.pm);
    return flags.pm;
  }

  const detected = detectPackageManager();
  if (flags.yes) {
    return detected;
  }

  return select<PackageManager>({
    message: 'Package manager',
    default: detected,
    choices: [
      { name: 'npm', value: 'npm' },
      { name: 'pnpm', value: 'pnpm' },
      { name: 'bun', value: 'bun' },
    ],
  });
}

async function resolveBoolean(
  value: boolean | undefined,
  yes: boolean,
  defaultValue: boolean,
  message: string
) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (yes) {
    return defaultValue;
  }

  return confirm({ message, default: defaultValue });
}

export async function resolveCreateOptions(
  targetDir: string,
  flags: RawCreateFlags
): Promise<CreateOptions> {
  const yes = flags.yes ?? false;

  return {
    targetDir,
    packageManager: await resolvePackageManager(flags),
    unit: await resolveBoolean(flags.unit, yes, true, 'Install Vitest + React Testing Library?'),
    e2e: await resolveBoolean(flags.e2e, yes, false, 'Install Playwright E2E testing?'),
    commitlint: await resolveBoolean(flags.commitlint, yes, false, 'Install commitlint?'),
    yes,
    dryRun: flags.dryRun ?? false,
    skipInstall: flags.skipInstall ?? false,
    shadcnArgs: flags.shadcnArgs ?? [],
    mcp: await resolveBoolean(
      flags.mcp,
      yes,
      false,
      'Install shadcn MCP for Claude, Codex, and OpenCode?'
    ),
    icons: resolveIconOption(flags.icons),
  };
}

export async function runCreate(targetDir: string, flags: RawCreateFlags) {
  const options = await resolveCreateOptions(targetDir, flags);
  const executor = options.dryRun ? new DryRunExecutor() : new RealExecutor();

  const projectRoot = await createNextApp(options, executor);
  await initializeShadcn(projectRoot, options, executor);
  await installQualityLayer(projectRoot, options, executor);
  await installTestingFiles(projectRoot, options, executor);
  await installSkills(projectRoot, options, executor);
  await installDocsAndClaude(projectRoot, options, executor);
  await installShadcnMcp(projectRoot, options, executor);

  if (executor instanceof DryRunExecutor) {
    for (const operation of executor.operations) {
      console.log(operation);
    }
    return;
  }

  // Normalize formatting of files emitted by create-next-app, shadcn, and the
  // templates (line endings/quote style differ across tools and OSes) so the
  // generated app is Prettier-clean, then run its own quality gate as a
  // self-test. Both are skipped when no dependencies were installed (the gate
  // would fail spuriously without Prettier/ESLint/etc.).
  if (!options.skipInstall) {
    await executor.run(options.packageManager, ['run', 'format'], { cwd: projectRoot });
    await executor.run(options.packageManager, ['run', 'check'], { cwd: projectRoot });
  }
}
