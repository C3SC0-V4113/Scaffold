import { confirm, select } from '@inquirer/prompts';

import { DryRunExecutor, RealExecutor } from '../executor.js';
import { defaultFramework, frameworkRegistry, isFramework } from '../frameworks/registry.js';
import { createAstroApp } from '../installers/astro.js';
import { installDocsAndClaude } from '../installers/docs.js';
import { createNextApp } from '../installers/next.js';
import { installQualityLayer } from '../installers/quality.js';
import { installShadcnMcp } from '../installers/shadcn-mcp.js';
import { initializeShadcn } from '../installers/shadcn.js';
import { installSkills } from '../installers/skills.js';
import { installTestingFiles } from '../installers/testing.js';
import { supportedIconLibraries } from '../templates/icons.js';
import type { AstroServerAdapter, CreateOptions, IconLibrary, PackageManager } from '../types.js';

export interface RawCreateFlags {
  pm?: PackageManager;
  framework?: string;
  ssr?: boolean;
  adapter?: string;
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
const astroAdapters = ['node', 'vercel', 'netlify', 'cloudflare'] as const;

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

function isAstroAdapter(value: string): value is AstroServerAdapter {
  return astroAdapters.includes(value as AstroServerAdapter);
}

function resolveAstroAdapterOption(adapter: string | undefined): AstroServerAdapter | undefined {
  if (adapter === undefined) {
    return undefined;
  }

  if (!isAstroAdapter(adapter)) {
    throw new Error(
      `Unsupported Astro adapter "${adapter}". Use ${astroAdapters.join(', ')}.`
    );
  }

  return adapter;
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

async function resolveFramework(flags: RawCreateFlags): Promise<CreateOptions['framework']> {
  if (flags.framework) {
    if (!isFramework(flags.framework)) {
      throw new Error(
        `Unsupported framework "${flags.framework}". Use ${frameworkRegistry.map((item) => item.value).join(', ')}.`
      );
    }

    return flags.framework;
  }

  if (flags.yes ?? false) {
    return defaultFramework;
  }

  return select({
    message: 'Framework',
    default: defaultFramework,
    choices: frameworkRegistry.map((framework) => ({
      name: framework.label,
      value: framework.value,
      description: framework.description,
    })),
  });
}

export async function resolveCreateOptions(
  targetDir: string,
  flags: RawCreateFlags
): Promise<CreateOptions> {
  const yes = flags.yes ?? false;
  const framework = await resolveFramework(flags);
  const packageManager = await resolvePackageManager(flags);

  if (framework !== 'astro' && (flags.ssr !== undefined || flags.adapter !== undefined)) {
    throw new Error('--ssr and --adapter are only available when --framework astro is selected.');
  }

  if (framework === 'astro' && packageManager === 'bun') {
    throw new Error('Astro scaffolding is not available with bun yet. Use npm or pnpm.');
  }

  const ssrEnabled =
    framework === 'astro' && (flags.adapter !== undefined || (await resolveBoolean(flags.ssr, yes, false, 'Enable Astro SSR?')));
  const astroAdapter =
    framework === 'astro' && ssrEnabled
      ? resolveAstroAdapterOption(flags.adapter) ??
        (yes ? 'cloudflare' : await select<AstroServerAdapter>({
          message: 'Astro SSR adapter',
          default: 'cloudflare',
          choices: astroAdapters.map((adapter) => ({
            name: adapter,
            value: adapter,
          })),
        }))
      : undefined;

  return {
    targetDir,
    framework,
    packageManager,
    ssr: ssrEnabled,
    astroAdapter,
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

  const projectRoot =
    options.framework === 'astro'
      ? await createAstroApp(options, executor)
      : await createNextApp(options, executor);
  await initializeShadcn(projectRoot, options, executor);
  await installQualityLayer(projectRoot, options, executor);
  await installTestingFiles(projectRoot, options, executor);
  if (options.framework === 'next') {
    await installSkills(projectRoot, options, executor);
    await installDocsAndClaude(projectRoot, options, executor);
  }
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
    if (options.framework === 'astro') {
      await executor.run(options.packageManager, ['run', 'lint:fix'], { cwd: projectRoot });
    }
    await executor.run(options.packageManager, ['run', 'format'], { cwd: projectRoot });
    await executor.run(options.packageManager, ['run', 'check'], { cwd: projectRoot });
  }
}
