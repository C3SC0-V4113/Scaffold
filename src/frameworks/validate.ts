import type { AstroServerAdapter, PackageManager, RouterChoice } from '../types.js';
import { frameworkRegistry } from './registry.js';
import type { FrameworkAdapter } from './types.js';

function formatChoices(values: readonly string[]) {
  if (values.length < 2) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} or ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, or ${values.at(-1)}`;
}

export function validateFrameworkOptions(
  adapter: FrameworkAdapter,
  packageManager: PackageManager,
  flags: { ssr?: boolean; adapter?: string; router?: string },
) {
  const allRouters: RouterChoice[] = ['none', 'react-router-data', 'react-router-declarative'];
  if (flags.router !== undefined && !allRouters.includes(flags.router as RouterChoice)) {
    throw new Error(
      'Unsupported router "' + flags.router + '". Use none, react-router-data, or react-router-declarative.',
    );
  }
  if (
    flags.router !== undefined &&
    flags.router !== 'none' &&
    !adapter.capabilities.routers.includes(flags.router as RouterChoice)
  ) {
    const frameworks = frameworkRegistry
      .filter((item) => item.capabilities.routers.includes(flags.router as RouterChoice))
      .map((item) => item.id);
    throw new Error(
      `--router is only available when --framework ${formatChoices(frameworks)} is selected.`,
    );
  }
  if (
    !adapter.capabilities.rendering?.ssr &&
    (flags.ssr !== undefined || flags.adapter !== undefined)
  ) {
    const frameworks = frameworkRegistry
      .filter((item) => item.capabilities.rendering?.ssr)
      .map((item) => item.id);
    throw new Error(
      `--ssr and --adapter are only available when --framework ${frameworks.join(', ')} is selected.`,
    );
  }
  if (!adapter.capabilities.packageManagers.includes(packageManager)) {
    throw new Error(
      `${adapter.label} scaffolding is not available with ${packageManager} yet. Use ${formatChoices(adapter.capabilities.packageManagers)}.`,
    );
  }
}

export function resolveServerAdapter(
  adapter: FrameworkAdapter,
  value?: string,
) {
  if (value === undefined) return undefined;
  const allowed = adapter.capabilities.rendering?.adapters ?? [];
  if (!allowed.includes(value as AstroServerAdapter)) {
    throw new Error(
      `Unsupported ${adapter.label} adapter "${value}". Use ${allowed.join(', ')}.`,
    );
  }
  return value as AstroServerAdapter;
}
