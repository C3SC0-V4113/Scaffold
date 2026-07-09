import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildProgram } from '../src/cli.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('purrfold info command', () => {
  it('emits a JSON schema with options and scenarios', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const program = buildProgram();
    program.exitOverride();
    await program.parseAsync(['info', '--json'], { from: 'user' });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    const schema = JSON.parse(output) as {
      name: string;
      version: string;
      install: string;
      options: { flags: string }[];
      scenarios: { command: string }[];
    };

    expect(schema.name).toBe('purrfold');
    expect(typeof schema.version).toBe('string');
    expect(schema.install).toContain('npx purrfold@latest');

    const flagText = schema.options.map((option) => option.flags).join(' ');
    expect(flagText).toContain('--framework');
    expect(flagText).toContain('--ssr');
    expect(flagText).toContain('--adapter');
    expect(flagText).toContain('--no-unit');
    expect(flagText).toContain('--no-e2e');
    expect(flagText).toContain('--motion');

    const commands = schema.scenarios.map((scenario) => scenario.command);
    expect(
      commands.some((command) => command.includes('--no-unit') && command.includes('--no-e2e'))
    ).toBe(true);
    expect(commands.some((command) => command.includes('--ssr') && command.includes('--adapter'))).toBe(true);
    expect(commands.some((command) => command.includes('--motion'))).toBe(true);
  });

  it('prints a human-readable summary without --json', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const program = buildProgram();
    program.exitOverride();
    await program.parseAsync(['info'], { from: 'user' });

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('purrfold v');
    expect(output).toContain('Common scenarios');
  });
});
