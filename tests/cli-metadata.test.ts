import { describe, expect, it } from 'vitest';

import { cliOptions, cliScenarios, installCommand } from '../src/cli-metadata.js';

describe('cli metadata', () => {
  it('documents every create flag', () => {
    const text = cliOptions.map((option) => option.flags).join(' ');
    const flags = [
      '--pm',
      '--unit',
      '--no-unit',
      '--e2e',
      '--no-e2e',
      '--commitlint',
      '--no-commitlint',
      '--yes',
      '--dry-run',
      '--skip-install',
      '--shadcn-args',
    ];

    for (const flag of flags) {
      expect(text).toContain(flag);
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
  });

  it('exposes the install command', () => {
    expect(installCommand).toContain('npx purrfold@latest');
  });
});
