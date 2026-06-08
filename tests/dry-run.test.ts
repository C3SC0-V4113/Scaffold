import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCreate } from '../src/commands/create.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dry-run integration', () => {
  it('prints npm all-options operations without executing real commands', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      pm: 'npm',
      unit: true,
      e2e: true,
      commitlint: true,
      yes: true,
      dryRun: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('run npx create-next-app@latest my-app');
    expect(output).toContain('run npx shadcn@latest init --defaults');
    expect(output).toContain('my-app\\skills.sh');
    expect(output).toContain(
      'run npx --yes skills@latest add vercel-labs/agent-skills --skill composition-patterns --skill react-best-practices --agent codex --copy --yes'
    );
    expect(output).toContain('write');
    expect(output).toContain('link');
  });

  it('prints pnpm operations with selected options', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      pm: 'pnpm',
      unit: false,
      e2e: true,
      commitlint: false,
      yes: true,
      dryRun: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('run pnpm dlx create-next-app@latest my-app');
    expect(output).toContain('write');
    expect(output).not.toContain('vitest.config.mts');
  });

  it('prints bun operations with selected options', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      pm: 'bun',
      unit: true,
      e2e: false,
      commitlint: true,
      yes: true,
      dryRun: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('run bunx --bun create-next-app@latest my-app');
    expect(output).toContain('write');
    expect(output).not.toContain('playwright.config.ts');
  });
});
