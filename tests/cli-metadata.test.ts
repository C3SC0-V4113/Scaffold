import { describe, expect, it, vi } from 'vitest';

import { cliOptions, cliScenarios, installCommand } from '../src/cli-metadata.js';
import { buildProgram } from '../src/cli.js';

/** Long flag names Commander actually accepts on `create`, e.g. `--no-ci`. */
function createCommandFlags(): string[] {
  const create = buildProgram().commands.find((command) => command.name() === 'create');
  if (!create) {
    throw new Error('create command not found');
  }

  return create.options.flatMap((option) => option.long ?? []);
}

describe('cli metadata', () => {
  // Derived from Commander rather than a hand-kept list: cli-metadata.ts is the
  // source of truth that --help, `info --json`, the README table, llms.txt, and
  // the Claude skill all mirror, so an undocumented flag has to fail here
  // instead of shipping and silently diverging from every doc.
  it('documents every create flag', () => {
    const text = cliOptions.map((option) => option.flags).join(' ');

    for (const flag of createCommandFlags()) {
      expect(text, `${flag} is not documented in cliOptions`).toContain(flag);
    }
  });

  it('documents no flag the CLI does not accept', () => {
    const accepted = createCommandFlags();
    const documented = cliOptions.flatMap((option) => option.flags.match(/--[\w-]+/g) ?? []);

    for (const flag of documented) {
      expect(accepted, `${flag} is documented but not accepted by the CLI`).toContain(flag);
    }
  });

  it('exposes runnable purrfold scenarios', () => {
    expect(cliScenarios.length).toBeGreaterThan(0);

    for (const scenario of cliScenarios) {
      expect(scenario.intent.length).toBeGreaterThan(0);
      expect(scenario.command.startsWith('npx purrfold@latest')).toBe(true);
    }

    const commands = cliScenarios.map((scenario) => scenario.command);
    expect(
      commands.some((command) => command.includes('--no-unit') && command.includes('--no-e2e'))
    ).toBe(true);
    expect(commands.some((command) => command.includes('--mcp'))).toBe(true);
    expect(commands.some((command) => command.includes('--motion'))).toBe(true);
    expect(commands.some((command) => command.includes('--query'))).toBe(true);
    expect(commands.some((command) => command.includes('--ci'))).toBe(true);
    expect(commands.some((command) => command.includes('--preset b3REw8vwo'))).toBe(true);
    expect(
      commands.some((command) => command.includes('--framework astro --ssr --adapter cloudflare'))
    ).toBe(true);
    expect(
      commands.some((command) => command.includes('--framework vite --yes')),
    ).toBe(true);
    expect(commands.some((command) => command.includes('--router react-router-declarative'))).toBe(true);
    expect(commands.some((command) => command.includes('--router none'))).toBe(true);
  });

  it('exposes the install command', () => {
    expect(installCommand).toContain('npx purrfold@latest');
  });

  it('lists router capabilities per framework in info JSON', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await buildProgram().parseAsync(['node', 'purrfold', 'info', '--json']);
      const schema = JSON.parse(String(log.mock.calls[0]?.[0])) as {
        frameworks: Array<{ id: string; routers: string[]; defaultRouter: string; rendering: { ssr: boolean; defaultSsr: boolean } | null }>;
      };
      expect(schema.frameworks).toEqual([
        { id: 'next', routers: [], defaultRouter: 'none', rendering: null },
        { id: 'astro', routers: [], defaultRouter: 'none', rendering: { ssr: true, defaultSsr: false } },
        {
          id: 'vite',
          routers: ['none', 'react-router-data', 'react-router-declarative'],
          defaultRouter: 'react-router-data',
          rendering: null,
        },
        {
          id: 'react-router',
          routers: [],
          defaultRouter: 'none',
          rendering: { ssr: true, defaultSsr: true },
        },
      ]);
    } finally {
      log.mockRestore();
    }
  });
});
