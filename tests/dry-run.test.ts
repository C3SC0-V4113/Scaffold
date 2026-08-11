import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCreate } from '../src/commands/create.js';
import { pinnedSpecifier } from '../src/installers/config-model.js';

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
    expect(output).toContain('--disable-git');
    expect(output).toContain('run npx shadcn@latest init --defaults');
    expect(output).toContain(pinnedSpecifier('@vitejs/plugin-react'));
    expect(output).not.toContain('@vitejs/plugin-react@6.0.2');
    expect(output).not.toContain('mcp init --client');
    expect(output.replaceAll('\\', '/')).toContain('my-app/skills.sh');
    expect(output.replaceAll('\\', '/')).toContain('my-app/commitlint.config.mjs');
    expect(output).not.toContain('commitlint.config.js ');
    expect(output.match(/run git init --initial-branch=main/g)).toHaveLength(1);
    expect(output).toContain('run npx husky');
    expect(output.indexOf('run git init --initial-branch=main')).toBeGreaterThan(
      Math.max(output.lastIndexOf('write '), output.lastIndexOf('link '))
    );
    expect(output).toContain(
      'run npx --yes skills@latest add https://github.com/vercel-labs/agent-skills --skill vercel-composition-patterns --skill vercel-react-best-practices --agent codex --copy --yes'
    );
    expect(output.replaceAll('\\', '/')).toContain('/my-app/README.md');
    expect(output.replaceAll('\\', '/')).toContain('/my-app/AGENTS.md');
    expect(output.replaceAll('\\', '/')).toContain('/my-app/CLAUDE.md');
    expect(output.replaceAll('\\', '/')).toContain('/my-app/DESIGN.md');
    expect(output.replaceAll('\\', '/')).toContain('/my-app/.claude/settings.json');
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
    expect(output).toContain('--disable-git');
    expect(output).toContain('run pnpm exec husky');
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
    const normalizedOutput = output.replaceAll('\\', '/');
    expect(output).toContain('run pnpm create astro@latest my-app');
    expect(output).toContain('--no-install');
    expect(output).not.toContain('--add react');
    expect(normalizedOutput).toContain('/my-app/pnpm-workspace.yaml');
    expect(output).toContain('run pnpm install (cwd ');
    expect(output).toContain('run pnpm exec astro add react --yes (cwd ');
    expect(normalizedOutput.indexOf('/my-app/pnpm-workspace.yaml')).toBeLessThan(
      normalizedOutput.indexOf('run pnpm install (cwd ')
    );
    expect(normalizedOutput.indexOf('run pnpm install (cwd ')).toBeLessThan(
      normalizedOutput.indexOf('run pnpm exec astro add react --yes (cwd ')
    );
    expect(output.match(/--no-git/g)).toHaveLength(1);
    expect(output).not.toContain(' --git');
    expect(output).toContain('run pnpm dlx shadcn@latest init -t astro --defaults');
    expect(output).toContain(pinnedSpecifier('@astrojs/check'));
    expect(output).toContain(pinnedSpecifier('@vitejs/plugin-react', 'astro'));
    expect(output).not.toContain(pinnedSpecifier('@vitejs/plugin-react'));
    expect(output.replaceAll('\\', '/')).toContain('my-app/src/components/Button.astro');
    expect(output.replaceAll('\\', '/')).toContain(
      'my-app/.agents/skills/shadcn-component-boundaries/SKILL.md'
    );
    expect(output.replaceAll('\\', '/')).toContain('my-app/skills.sh');
    expect(output.replaceAll('\\', '/')).toContain(
      'my-app/.claude/skills ->'
    );
    expect(output.replaceAll('\\', '/')).toContain('/my-app/README.md');
    expect(output.replaceAll('\\', '/')).toContain('/my-app/AGENTS.md');
    expect(output.replaceAll('\\', '/')).toContain('/my-app/CLAUDE.md');
    expect(output.replaceAll('\\', '/')).toContain('/my-app/DESIGN.md');
    expect(output.replaceAll('\\', '/')).toContain('/my-app/.claude/settings.json');
    expect(output).not.toContain('--no-ai');
    expect(output).not.toContain('create-next-app@latest');
  });

  it('keeps Astro base installation when additional quality installs are skipped', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('my-app', {
      framework: 'astro',
      pm: 'npm',
      yes: true,
      dryRun: true,
      skipInstall: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('run npm install (cwd ');
    expect(output).toContain('run npx astro add react --yes (cwd ');
    expect(output).not.toContain('run npm install --save-dev');
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
    expect(output).toContain(`run pnpm add ${pinnedSpecifier('@astrojs/cloudflare')}`);
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
    expect(output).toContain('--disable-git');
    expect(output).toContain('write');
    expect(output).not.toContain('playwright.config.ts');
  });

  it.each([
    ['npm', `run npm install ${pinnedSpecifier('motion')}`],
    ['pnpm', `run pnpm add ${pinnedSpecifier('motion')}`],
    ['bun', `run bun add ${pinnedSpecifier('motion')}`],
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
    expect(output).not.toContain(`default-app ${pinnedSpecifier('motion')}`);
    expect(output).not.toContain(`run npm install ${pinnedSpecifier('motion')}`);
  });

  it('initializes a repository but does not activate Husky when installation is skipped', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCreate('skip-app', {
      pm: 'npm',
      yes: true,
      dryRun: true,
      skipInstall: true,
    });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output.match(/run git init --initial-branch=main/g)).toHaveLength(1);
    expect(output).not.toContain('run npx husky');
    expect(output.indexOf('run git init --initial-branch=main')).toBeGreaterThan(
      Math.max(output.lastIndexOf('write '), output.lastIndexOf('link '))
    );
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

  // `--ci` gates the whole .github/workflows directory; `--e2e` still decides
  // whether playwright.yml is among the files written. quality.yml used to be
  // the CLI's only ungated side effect on .github/, and nothing asserted on
  // either path.
  describe('CI workflow generation', () => {
    async function operations(flags: Parameters<typeof runCreate>[1]) {
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      await runCreate('my-app', { pm: 'npm', yes: true, dryRun: true, ...flags });
      return log.mock.calls
        .map((call) => call.join(' '))
        .join('\n')
        .replaceAll('\\', '/');
    }

    it('writes no workflows by default', async () => {
      const output = await operations({ unit: true, e2e: true });

      expect(output).not.toContain('.github/workflows/');
    });

    it('writes quality.yml with --ci', async () => {
      const output = await operations({ ci: true, unit: true, e2e: false });

      expect(output).toContain('my-app/.github/workflows/quality.yml');
      expect(output).not.toContain('playwright.yml');
    });

    it('writes both workflows with --ci --e2e', async () => {
      const output = await operations({ ci: true, unit: true, e2e: true });

      expect(output).toContain('my-app/.github/workflows/quality.yml');
      expect(output).toContain('my-app/.github/workflows/playwright.yml');
    });

    it('writes Playwright config but no workflow for --e2e without --ci', async () => {
      const output = await operations({ ci: false, unit: false, e2e: true });

      expect(output).toContain('my-app/playwright.config.ts');
      expect(output).toContain('my-app/tests/e2e/home.spec.ts');
      expect(output).not.toContain('.github/workflows/');
    });
  });
});
