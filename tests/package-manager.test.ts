import { describe, expect, it } from 'vitest';

import { getPackageManagerCommands } from '../src/package-manager.js';

describe('package manager command mapping', () => {
  it('maps npm commands', () => {
    const commands = getPackageManagerCommands('npm');

    expect(commands.createNextApp('my-app', true)).toEqual({
      command: 'npx',
      args: expect.arrayContaining(['create-next-app@latest', 'my-app', '--use-npm', '--yes']),
    });
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
      args: ['install', '--save-dev', 'vitest'],
    });
  });

  it('maps pnpm commands', () => {
    const commands = getPackageManagerCommands('pnpm');

    expect(commands.createNextApp('my-app', false)).toEqual({
      command: 'pnpm',
      args: expect.arrayContaining(['dlx', 'create-next-app@latest', 'my-app', '--use-pnpm']),
    });
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
  });

  it('maps bun commands', () => {
    const commands = getPackageManagerCommands('bun');

    expect(commands.createNextApp('my-app', false)).toEqual({
      command: 'bunx',
      args: expect.arrayContaining(['--bun', 'create-next-app@latest', 'my-app', '--use-bun']),
    });
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
  });
});
