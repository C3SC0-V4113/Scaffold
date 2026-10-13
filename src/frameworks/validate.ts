import type { AstroServerAdapter, PackageManager } from '../types.js';
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
  flags: { ssr?: boolean; adapter?: string }
) {
  if (!adapter.capabilities.rendering?.ssr && (flags.ssr !== undefined || flags.adapter !== undefined)) {
    const frameworks = frameworkRegistry
      .filter((item) => item.capabilities.rendering?.ssr)
      .map((item) => item.id);
    throw new Error(
      `--ssr and --adapter are only available when --framework ${frameworks.join(', ')} is selected.`
    );
  }
  if (!adapter.capabilities.packageManagers.includes(packageManager)) {
    throw new Error(
      `${adapter.label} scaffolding is not available with ${packageManager} yet. Use ${formatChoices(adapter.capabilities.packageManagers)}.`
    );
  }
}

export function resolveServerAdapter(adapter: FrameworkAdapter, value?: string) {
  if (value === undefined) return undefined;
  const allowed = adapter.capabilities.rendering?.adapters ?? [];
  if (!allowed.includes(value as AstroServerAdapter)) {
    throw new Error(`Unsupported ${adapter.label} adapter "${value}". Use ${allowed.join(', ')}.`);
  }
  return value as AstroServerAdapter;
}
