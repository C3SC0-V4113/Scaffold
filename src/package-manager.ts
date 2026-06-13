import type { PackageManager, ShadcnMcpClient } from './types.js';

export interface PackageManagerCommands {
  createNextApp: (targetDir: string, yes: boolean) => { command: string; args: string[] };
  shadcn: (args: string[]) => { command: string; args: string[] };
  shadcnMcp: (client: ShadcnMcpClient) => { command: string; args: string[] };
  addDev: (packages: string[]) => { command: string; args: string[] };
  add: (packages: string[]) => { command: string; args: string[] };
  remove: (packages: string[]) => { command: string; args: string[] };
  exec: (binary: string, args: string[]) => { command: string; args: string[] };
}

const createNextBaseArgs = [
  '--ts',
  '--eslint',
  '--tailwind',
  '--app',
  '--no-src-dir',
  '--import-alias',
  '@/*',
];

export function getPackageManagerCommands(packageManager: PackageManager): PackageManagerCommands {
  if (packageManager === 'pnpm') {
    return {
      createNextApp: (targetDir, yes) => ({
        command: 'pnpm',
        args: [
          'dlx',
          'create-next-app@latest',
          targetDir,
          ...createNextBaseArgs,
          '--use-pnpm',
          ...(yes ? ['--yes'] : []),
        ],
      }),
      shadcn: (args) => ({ command: 'pnpm', args: ['dlx', 'shadcn@latest', ...args] }),
      shadcnMcp: (client) => ({
        command: 'pnpm',
        args: ['dlx', 'shadcn@latest', 'mcp', 'init', '--client', client],
      }),
      addDev: (packages) => ({ command: 'pnpm', args: ['add', '-D', ...packages] }),
      add: (packages) => ({ command: 'pnpm', args: ['add', ...packages] }),
      remove: (packages) => ({ command: 'pnpm', args: ['remove', ...packages] }),
      exec: (binary, args) => ({ command: 'pnpm', args: ['exec', binary, ...args] }),
    };
  }

  if (packageManager === 'bun') {
    return {
      createNextApp: (targetDir, yes) => ({
        command: 'bunx',
        args: [
          '--bun',
          'create-next-app@latest',
          targetDir,
          ...createNextBaseArgs,
          '--use-bun',
          ...(yes ? ['--yes'] : []),
        ],
      }),
      shadcn: (args) => ({ command: 'bunx', args: ['--bun', 'shadcn@latest', ...args] }),
      shadcnMcp: (client) => ({
        command: 'bunx',
        args: ['--bun', 'shadcn@latest', 'mcp', 'init', '--client', client],
      }),
      addDev: (packages) => ({ command: 'bun', args: ['add', '-d', ...packages] }),
      add: (packages) => ({ command: 'bun', args: ['add', ...packages] }),
      remove: (packages) => ({ command: 'bun', args: ['remove', ...packages] }),
      exec: (binary, args) => ({ command: 'bunx', args: ['--bun', binary, ...args] }),
    };
  }

  return {
    createNextApp: (targetDir, yes) => ({
      command: 'npx',
      args: [
        'create-next-app@latest',
        targetDir,
        ...createNextBaseArgs,
        '--use-npm',
        ...(yes ? ['--yes'] : []),
      ],
    }),
    shadcn: (args) => ({ command: 'npx', args: ['shadcn@latest', ...args] }),
    shadcnMcp: (client) => ({
      command: 'npx',
      args: ['shadcn@latest', 'mcp', 'init', '--client', client],
    }),
    addDev: (packages) => ({ command: 'npm', args: ['install', '--save-dev', ...packages] }),
    add: (packages) => ({ command: 'npm', args: ['install', ...packages] }),
    remove: (packages) => ({ command: 'npm', args: ['uninstall', ...packages] }),
    exec: (binary, args) => ({ command: 'npx', args: [binary, ...args] }),
  };
}
