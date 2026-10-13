import type { AstroServerAdapter, PackageManager } from '../types.js';
import type { FrameworkAdapter } from './types.js';

export function validateFrameworkOptions(
  adapter: FrameworkAdapter,
  packageManager: PackageManager,
  flags: { ssr?: boolean; adapter?: string }
) {
  if (!adapter.capabilities.rendering?.ssr && (flags.ssr !== undefined || flags.adapter !== undefined)) {
    throw new Error('--ssr and --adapter are only available when --framework astro is selected.');
  }
  if (!adapter.capabilities.packageManagers.includes(packageManager)) {
    throw new Error('Astro scaffolding is not available with bun yet. Use npm or pnpm.');
  }
}

export function resolveServerAdapter(adapter: FrameworkAdapter, value?: string) {
  if (value === undefined) return undefined;
  const allowed = adapter.capabilities.rendering?.adapters ?? [];
  if (!allowed.includes(value as AstroServerAdapter)) {
    throw new Error(`Unsupported Astro adapter "${value}". Use ${allowed.join(', ')}.`);
  }
  return value as AstroServerAdapter;
}
