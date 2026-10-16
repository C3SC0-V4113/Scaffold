import { describe, expect, it } from 'vitest';

import { frameworkAdapters, frameworkRegistry, getFrameworkAdapter } from '../src/frameworks/registry.js';
import { resolveServerAdapter, validateFrameworkOptions } from '../src/frameworks/validate.js';
import { playwrightConfig, renderPlaywrightConfig } from '../src/templates/files.js';
import type { Framework } from '../src/types.js';

describe('framework adapter registry', () => {
  it('registers an adapter for every framework', () => {
    const frameworks: Framework[] = ['next', 'astro', 'vite'];
    expect(Object.keys(frameworkAdapters).sort()).toEqual([...frameworks].sort());
    expect(frameworkRegistry.map((adapter) => adapter.id).sort()).toEqual([...frameworks].sort());
  });

  it('returns the registered adapter', () => {
    expect(getFrameworkAdapter('next')).toBe(frameworkAdapters.next);
    expect(getFrameworkAdapter('astro')).toBe(frameworkAdapters.astro);
    expect(getFrameworkAdapter('vite')).toBe(frameworkAdapters.vite);
  });
});

describe('framework Playwright config', () => {
  it('preserves the pre-PR Next, Astro, and Vite server commands', () => {
    expect(renderPlaywrightConfig('npm', frameworkAdapters.next.playwrightServer)).toBe(
      playwrightConfig,
    );
    expect(renderPlaywrightConfig('npm', frameworkAdapters.astro.playwrightServer)).toBe(
      playwrightConfig,
    );
    expect(renderPlaywrightConfig('npm', frameworkAdapters.vite.playwrightServer)).toBe(
      playwrightConfig.replace(
        'npm run dev -- --hostname 127.0.0.1 --port 3000',
        'npm run dev -- --host 127.0.0.1 --port 3000',
      ),
    );
    expect(playwrightConfig).not.toContain('PURRFOLD_E2E_SERVER_COMMAND');
  });
});

describe('framework capability validation', () => {
  it('preserves the SSR and adapter validation message', () => {
    expect(() => validateFrameworkOptions(frameworkAdapters.next, 'npm', { ssr: true })).toThrowError(
      new Error('--ssr and --adapter are only available when --framework astro is selected.')
    );
  });

  it('preserves the combined SSR and adapter error for frameworks without rendering', () => {
    expect(() => validateFrameworkOptions(frameworkAdapters.next, 'npm', { adapter: 'node' })).toThrow(
      '--ssr and --adapter are only available when --framework astro is selected.',
    );
  });

  it('preserves the Astro package manager validation message', () => {
    expect(() => validateFrameworkOptions(frameworkAdapters.astro, 'bun', {})).toThrowError(
      new Error('Astro scaffolding is not available with bun yet. Use npm or pnpm.')
    );
  });

  it('uses adapter capabilities in package manager validation', () => {
    const npmOnlyAdapter = {
      ...frameworkAdapters.astro,
      capabilities: { ...frameworkAdapters.astro.capabilities, packageManagers: ['npm'] as const },
    };
    expect(() => validateFrameworkOptions(npmOnlyAdapter, 'pnpm', {})).toThrowError(
      new Error('Astro scaffolding is not available with pnpm yet. Use npm.')
    );
  });

  it('uses the adapter label in server adapter validation', () => {
    expect(() => resolveServerAdapter(frameworkAdapters.astro, 'invalid')).toThrowError(
      new Error('Unsupported Astro adapter "invalid". Use node, vercel, netlify, cloudflare.')
    );
  });

  it('accepts supported framework and package manager combinations', () => {
    expect(() => validateFrameworkOptions(frameworkAdapters.next, 'bun', {})).not.toThrow();
    expect(() => validateFrameworkOptions(frameworkAdapters.astro, 'pnpm', { ssr: true })).not.toThrow();
  });
});
