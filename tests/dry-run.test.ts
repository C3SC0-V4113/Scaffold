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
    expect(output).toContain('@vitejs/plugin-react@5.1.2');
    expect(output).not.toContain('@vitejs/plugin-react@6.0.2');
    expect(output).not.toContain('mcp init --client');
    expect(output.replaceAll('\\', '/')).toContain('my-app/skills.sh');
    expect(output).toContain(
      'run npx --yes skills@latest add https://github.com/vercel-labs/agent-skills --skill vercel-composition-patterns --skill vercel-react-best-practices --agent codex --copy --yes'
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

  it('prints Astro operations with React-enabled shadcn setup', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      framework: 'astro',
      pm: 'pnpm',
      unit: true,
      e2e: false,
      commitlint: false,
      yes: true,
      dryRun: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('run pnpm create astro@latest my-app');
    expect(output).toContain('run pnpm dlx shadcn@latest init -t astro --defaults');
    expect(output).toContain('@astrojs/check@0.9.9');
    expect(output).toContain('@vitejs/plugin-react@5.2.0');
    expect(output).not.toContain('@vitejs/plugin-react@5.1.2');
    expect(output.replaceAll('\\', '/')).toContain('my-app/src/components/Button.astro');
    expect(output.replaceAll('\\', '/')).toContain(
      'my-app/.agents/skills/shadcn-component-boundaries/SKILL.md'
    );
    expect(output.replaceAll('\\', '/')).toContain('my-app/skills.sh');
    expect(output.replaceAll('\\', '/')).toContain(
      'my-app/.claude/skills ->'
    );
    expect(output).not.toContain('--no-ai');
    expect(output).not.toContain('create-next-app@latest');
  });

  it('prints Astro SSR adapter operations when SSR is enabled', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      framework: 'astro',
      pm: 'pnpm',
      ssr: true,
      unit: true,
      e2e: false,
      commitlint: false,
      yes: true,
      dryRun: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('run pnpm create astro@latest my-app');
    expect(output).toContain('run pnpm add @astrojs/cloudflare@14.1.2');
    expect(output).toContain('write');
    expect(output).toContain('astro.config.mjs');
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

  it.each([
    ['npm', 'run npm install motion@12.42.2'],
    ['pnpm', 'run pnpm add motion@12.42.2'],
    ['bun', 'run bun add motion@12.42.2'],
  ] as const)('prints the optional Motion install for %s', async (pm, expected) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      pm,
      motion: true,
      yes: true,
      dryRun: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain(expected);
    expect(output).toContain(
      'freshtechbro/claudedesignskills --skill motion-framer --agent codex --copy --yes'
    );
  });

  it('does not install Motion by default or when package installation is skipped', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('default-app', { yes: true, dryRun: true });
    await runCreate('skip-app', {
      motion: true,
      yes: true,
      dryRun: true,
      skipInstall: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).not.toContain('default-app motion@12.42.2');
    expect(output).not.toContain('run npm install motion@12.42.2');
  });

  it('prints MCP setup commands only when requested and preserves shadcn presets', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      pm: 'pnpm',
      unit: false,
      e2e: false,
      commitlint: false,
      yes: true,
      dryRun: true,
      shadcnArgs: ['--preset', 'b3REw8vwo'],
      mcp: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('run pnpm dlx shadcn@latest init --defaults --preset b3REw8vwo');
    expect(output).toContain('run pnpm dlx shadcn@latest mcp init --client claude');
    expect(output).toContain('run pnpm dlx shadcn@latest mcp init --client codex');
    expect(output).toContain('run pnpm dlx shadcn@latest mcp init --client opencode');
  });

  it('runs MCP setup after quality dependencies when requested', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      pm: 'pnpm',
      unit: true,
      e2e: false,
      commitlint: false,
      yes: true,
      dryRun: true,
      shadcnArgs: ['--preset', 'b3REw8vwo'],
      mcp: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    const qualityInstallIndex = output.indexOf('pnpm add -D');
    const mcpIndex = output.indexOf('pnpm dlx shadcn@latest mcp init --client claude');

    expect(qualityInstallIndex).toBeGreaterThan(-1);
    expect(mcpIndex).toBeGreaterThan(qualityInstallIndex);
    expect(output).toContain('run pnpm dlx shadcn@latest init --defaults --preset b3REw8vwo');
    expect(output).toContain('run pnpm dlx shadcn@latest mcp init --client claude');
    expect(output).toContain('run pnpm dlx shadcn@latest mcp init --client codex');
    expect(output).toContain('run pnpm dlx shadcn@latest mcp init --client opencode');
  });
});
