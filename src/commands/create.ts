import { confirm, select } from '@inquirer/prompts';

import { DryRunExecutor, RealExecutor } from '../executor.js';
import { defaultFramework, frameworkRegistry, getFrameworkAdapter, isFramework } from '../frameworks/registry.js';
import { resolveServerAdapter, validateFrameworkOptions } from '../frameworks/validate.js';
import { getPackageManagerCommands } from '../package-manager.js';
import { installCiWorkflows } from '../installers/ci.js';
import { installDocsAndClaude } from '../installers/docs.js';
import { installMotion } from '../installers/motion.js';
import { installPnpmHardening, installQualityLayer } from '../installers/quality.js';
import { installShadcnMcp } from '../installers/shadcn-mcp.js';
import { initializeShadcn } from '../installers/shadcn.js';
import { installSkills } from '../installers/skills.js';
import { installTestingFiles } from '../installers/testing.js';
import { supportedIconLibraries } from '../templates/icons.js';
import { routerCatalog } from '../routers.js';
import type { AstroServerAdapter, CreateOptions, IconLibrary, PackageManager, RouterChoice } from '../types.js';

export interface RawCreateFlags {
  pm?: PackageManager;
  framework?: string;
  ssr?: boolean;
  adapter?: string;
  router?: string;
  unit?: boolean;
  e2e?: boolean;
  commitlint?: boolean;
  ci?: boolean;
  motion?: boolean;
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

async function resolveFramework(flags: RawCreateFlags): Promise<CreateOptions['framework']> {
  if (flags.framework) {
    if (!isFramework(flags.framework)) {
      throw new Error(
        `Unsupported framework "${flags.framework}". Use ${frameworkRegistry.map((item) => item.id).join(', ')}.`
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
      value: framework.id,
      description: framework.description,
    })),
  });
}

async function resolveRouter(
  adapter: ReturnType<typeof getFrameworkAdapter>,
  value: string | undefined,
  yes: boolean,
): Promise<RouterChoice> {
  const { routers, defaultRouter } = adapter.capabilities;
  if (routers.length === 0) return 'none';
  if (value !== undefined) return value as RouterChoice;

  const fallback = defaultRouter ?? routers[0] ?? 'none';
  if (yes) return fallback;

  return select<RouterChoice>({
    message: 'Router',
    default: fallback,
    choices: routers.map((router) => ({
      name: routerCatalog[router].label,
      value: router,
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

  const frameworkAdapter = getFrameworkAdapter(framework);
  validateFrameworkOptions(frameworkAdapter, packageManager, flags);
  const router = await resolveRouter(frameworkAdapter, flags.router, yes);
  const rendering = frameworkAdapter.capabilities.rendering;
  const ssrEnabled = Boolean(
    rendering?.ssr && (flags.adapter !== undefined || (await resolveBoolean(flags.ssr, yes, false, 'Enable Astro SSR?')))
  );
  const astroAdapter = ssrEnabled
    ? resolveServerAdapter(frameworkAdapter, flags.adapter) ??
      (yes
        ? rendering?.defaultAdapter
        : await select<AstroServerAdapter>({
            message: 'Astro SSR adapter',
            default: rendering?.defaultAdapter,
            choices: (rendering?.adapters ?? []).map((adapter) => ({ name: adapter, value: adapter })),
          }))
    : undefined;

  return {
    targetDir,
    framework,
    router,
    packageManager,
    ssr: ssrEnabled,
    astroAdapter,
    unit: await resolveBoolean(flags.unit, yes, true, 'Install Vitest + React Testing Library?'),
    e2e: await resolveBoolean(flags.e2e, yes, false, 'Install Playwright E2E testing?'),
    commitlint: await resolveBoolean(flags.commitlint, yes, false, 'Install commitlint?'),
    ci: await resolveBoolean(flags.ci, yes, false, 'Install GitHub Actions workflows?'),
    // Motion is deliberately flag-only: interactive mode and --yes both leave
    // it disabled unless the caller explicitly passes --motion.
    motion: flags.motion ?? false,
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

  const projectRoot = await getFrameworkAdapter(options.framework).scaffold(options, executor);
  await initializeShadcn(projectRoot, options, executor);
  await installQualityLayer(projectRoot, options, executor);
  await installMotion(projectRoot, options, executor);
  await installTestingFiles(projectRoot, options, executor);
  await installCiWorkflows(projectRoot, options, executor);
  await installSkills(projectRoot, options, executor);
  await installDocsAndClaude(projectRoot, options, executor);
  await installShadcnMcp(projectRoot, options, executor);

  // Last write to pnpm-workspace.yaml: nothing after this point resolves
  // dependencies, so the 24h release floor cannot break a later step.
  await installPnpmHardening(projectRoot, options, executor);

  // Normalize the files emitted by create-next-app, create-astro, `astro add`,
  // shadcn and the templates: import order and line endings/quote style differ
  // across tools and OSes, and the generated app has to satisfy its own lint
  // and Prettier config out of the box. Then run its quality gate as a
  // self-test. All of it is skipped when no dependencies were installed (the
  // gate would fail spuriously without Prettier/ESLint/etc.).
  if (!(executor instanceof DryRunExecutor) && !options.skipInstall) {
    await executor.run(options.packageManager, ['run', 'lint:fix'], { cwd: projectRoot });
    await executor.run(options.packageManager, ['run', 'format'], { cwd: projectRoot });
  }

  // Scaffolders are told not to own Git initialization. Purrfold creates one
  // predictable, commit-free repository only after the generated app files
  // have reached their final state, including when dependency installation is
  // skipped. Because both scaffolders run with Git disabled, this is the one
  // and only repository initialization in the generation flow.
  await executor.run('git', ['init', '--initial-branch=main'], { cwd: projectRoot });

  if (!options.skipInstall) {
    // Targeted dependency installs do not reliably run `prepare`, so activate
    // the already-written hooks explicitly once the repository exists.
    const commands = getPackageManagerCommands(options.packageManager);
    const enableHooks = commands.exec('husky', []);
    await executor.run(enableHooks.command, enableHooks.args, { cwd: projectRoot });
  }

  if (!(executor instanceof DryRunExecutor) && !options.skipInstall) {
    await executor.run(options.packageManager, ['run', 'check'], { cwd: projectRoot });
  }

  if (executor instanceof DryRunExecutor) {
    for (const operation of executor.operations) {
      console.log(operation);
    }
  }
}
