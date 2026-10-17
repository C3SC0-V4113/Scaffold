import type { PackageManager, ShadcnMcpClient } from './types.js';

export interface PackageManagerCommands {
  createNextApp: (targetDir: string, yes: boolean) => { command: string; args: string[] };
  createViteApp: (targetDir: string) => { command: string; args: string[] };
  createReactRouterApp: (targetDir: string) => { command: string; args: string[] };
  shadcn: (args: string[]) => { command: string; args: string[] };
  shadcnMcp: (client: ShadcnMcpClient) => { command: string; args: string[] };
  addDev: (packages: string[]) => { command: string; args: string[] };
  add: (packages: string[]) => { command: string; args: string[] };
  install: () => { command: string; args: string[] };
  remove: (packages: string[]) => { command: string; args: string[] };
  exec: (binary: string, args: string[]) => { command: string; args: string[] };
}

const createNextBaseArgs = [
  '--ts',
  '--eslint',
  '--tailwind',
  '--app',
  '--disable-git',
  '--no-src-dir',
  '--import-alias',
  '@/*',
];

const createViteBaseArgs = [
  '--template',
  'react-ts',
  '--no-interactive',
  '--no-immediate',
];

// The branch-qualified URL uses codeload directly and avoids the rate-limited GitHub API.
const REACT_ROUTER_TEMPLATE_URL =
  'https://github.com/remix-run/react-router-templates/tree/main/default';
const createReactRouterBaseArgs = [
  '--template',
  REACT_ROUTER_TEMPLATE_URL,
  '--yes',
  '--no-install',
  '--no-git-init',
  '--no-agent-skills',
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
      createViteApp: (targetDir) => ({
        command: 'pnpm',
        args: ['create', 'vite@latest', targetDir, ...createViteBaseArgs],
      }),
      createReactRouterApp: (targetDir) => ({
        command: 'pnpm',
        args: ['dlx', 'create-react-router@latest', targetDir, ...createReactRouterBaseArgs],
      }),
      shadcn: (args) => ({ command: 'pnpm', args: ['dlx', 'shadcn@latest', ...args] }),
      shadcnMcp: (client) => ({
        command: 'pnpm',
        args: ['dlx', 'shadcn@latest', 'mcp', 'init', '--client', client],
      }),
      addDev: (packages) => ({ command: 'pnpm', args: ['add', '-D', ...packages] }),
      add: (packages) => ({ command: 'pnpm', args: ['add', ...packages] }),
      install: () => ({ command: 'pnpm', args: ['install'] }),
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
      createViteApp: (targetDir) => ({
        command: 'bun',
        args: ['create', 'vite@latest', targetDir, ...createViteBaseArgs],
      }),
      createReactRouterApp: (targetDir) => ({
        command: 'bunx',
        args: ['--bun', 'create-react-router@latest', targetDir, ...createReactRouterBaseArgs],
      }),
      shadcn: (args) => ({ command: 'bunx', args: ['--bun', 'shadcn@latest', ...args] }),
      shadcnMcp: (client) => ({
        command: 'bunx',
        args: ['--bun', 'shadcn@latest', 'mcp', 'init', '--client', client],
      }),
      addDev: (packages) => ({ command: 'bun', args: ['add', '-d', ...packages] }),
      add: (packages) => ({ command: 'bun', args: ['add', ...packages] }),
      install: () => ({ command: 'bun', args: ['install'] }),
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
    createViteApp: (targetDir) => ({
      command: 'npm',
      args: ['create', 'vite@latest', targetDir, '--', ...createViteBaseArgs],
    }),
    createReactRouterApp: (targetDir) => ({
      command: 'npx',
      args: ['--yes', 'create-react-router@latest', targetDir, ...createReactRouterBaseArgs],
    }),
    shadcn: (args) => ({ command: 'npx', args: ['shadcn@latest', ...args] }),
    shadcnMcp: (client) => ({
      command: 'npx',
      args: ['shadcn@latest', 'mcp', 'init', '--client', client],
    }),
    addDev: (packages) => ({
      command: 'npm',
      args: ['install', '--legacy-peer-deps', '--save-dev', ...packages],
    }),
    add: (packages) => ({ command: 'npm', args: ['install', '--legacy-peer-deps', ...packages] }),
    install: () => ({ command: 'npm', args: ['install'] }),
    remove: (packages) => ({ command: 'npm', args: ['uninstall', ...packages] }),
    exec: (binary, args) => ({ command: 'npx', args: [binary, ...args] }),
  };
}
