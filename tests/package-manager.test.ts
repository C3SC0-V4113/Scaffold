import { describe, expect, it } from 'vitest';

import { getPackageManagerCommands } from '../src/package-manager.js';

describe('package manager command mapping', () => {
  function expectGitDisabledExactlyOnce(args: string[]) {
    expect(args.filter((arg) => arg === '--disable-git')).toHaveLength(1);
  }

  it('maps npm commands', () => {
    const commands = getPackageManagerCommands('npm');
    const create = commands.createNextApp('my-app', true);

    expect(create).toEqual({
      command: 'npx',
      args: expect.arrayContaining(['create-next-app@latest', 'my-app', '--use-npm', '--yes']),
    });
    expectGitDisabledExactlyOnce(create.args);
    expect(commands.shadcn(['init'])).toEqual({
      command: 'npx',
      args: ['shadcn@latest', 'init'],
    });
    expect(commands.shadcnMcp('codex')).toEqual({
      command: 'npx',
      args: ['shadcn@latest', 'mcp', 'init', '--client', 'codex'],
    });
    expect(commands.addDev(['vitest'])).toEqual({
      command: 'npm',
      args: ['install', '--legacy-peer-deps', '--save-dev', 'vitest'],
    });
    expect(commands.add(['motion'])).toEqual({
      command: 'npm',
      args: ['install', '--legacy-peer-deps', 'motion'],
    });
    expect(commands.install()).toEqual({ command: 'npm', args: ['install'] });
  });

  it('maps pnpm commands', () => {
    const commands = getPackageManagerCommands('pnpm');
    const create = commands.createNextApp('my-app', false);

    expect(create).toEqual({
      command: 'pnpm',
      args: expect.arrayContaining(['dlx', 'create-next-app@latest', 'my-app', '--use-pnpm']),
    });
    expectGitDisabledExactlyOnce(create.args);
    expect(commands.shadcn(['init'])).toEqual({
      command: 'pnpm',
      args: ['dlx', 'shadcn@latest', 'init'],
    });
    expect(commands.shadcnMcp('claude')).toEqual({
      command: 'pnpm',
      args: ['dlx', 'shadcn@latest', 'mcp', 'init', '--client', 'claude'],
    });
    expect(commands.addDev(['vitest'])).toEqual({
      command: 'pnpm',
      args: ['add', '-D', 'vitest'],
    });
    expect(commands.install()).toEqual({ command: 'pnpm', args: ['install'] });
  });

  it('maps bun commands', () => {
    const commands = getPackageManagerCommands('bun');
    const create = commands.createNextApp('my-app', false);

    expect(create).toEqual({
      command: 'bunx',
      args: expect.arrayContaining(['--bun', 'create-next-app@latest', 'my-app', '--use-bun']),
    });
    expectGitDisabledExactlyOnce(create.args);
    expect(commands.shadcn(['init'])).toEqual({
      command: 'bunx',
      args: ['--bun', 'shadcn@latest', 'init'],
    });
    expect(commands.shadcnMcp('opencode')).toEqual({
      command: 'bunx',
      args: ['--bun', 'shadcn@latest', 'mcp', 'init', '--client', 'opencode'],
    });
    expect(commands.addDev(['vitest'])).toEqual({
      command: 'bun',
      args: ['add', '-d', 'vitest'],
    });
    expect(commands.install()).toEqual({ command: 'bun', args: ['install'] });
  });
});
