import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { pinnedSpecifier } from '../src/installers/config-model.js';
import { installMotion } from '../src/installers/motion.js';
import type { CreateOptions, Executor } from '../src/types.js';

const motionPin = pinnedSpecifier('motion');

class RecordingExecutor implements Executor {
  readonly runs: Array<{ command: string; args: string[]; cwd?: string }> = [];
  readonly writes = new Map<string, string>();
  readonly files: Map<string, string>;

  constructor(initialFiles: Record<string, string> = {}) {
    this.files = new Map(Object.entries(initialFiles));
  }

  async run(command: string, args: string[], options?: { cwd?: string }) {
    this.runs.push({ command, args, cwd: options?.cwd });
  }

  async ensureDir() {}
  async pathExists(filePath: string) {
    return this.files.has(filePath);
  }
  async readFile(filePath: string) {
    return this.files.get(filePath) ?? '';
  }
  async writeFile(path: string, content: string) {
    this.writes.set(path, content);
    this.files.set(path, content);
  }
  async writeJson() {}
  async remove() {}
  async symlinkOrJunction() {}
}

function options(
  packageManager: CreateOptions['packageManager'],
  overrides: Partial<CreateOptions> = {}
): CreateOptions {
  return {
    targetDir: 'my-app',
    framework: 'next',
    packageManager,
    ssr: false,
    unit: true,
    e2e: false,
    commitlint: false,
    motion: true,
    yes: true,
    dryRun: false,
    skipInstall: false,
    shadcnArgs: [],
    mcp: false,
    ...overrides,
  };
}

describe('Motion installer', () => {
  it.each([
    ['npm', 'npm', ['install', motionPin]],
    ['pnpm', 'pnpm', ['add', motionPin]],
    ['bun', 'bun', ['add', motionPin]],
  ] as const)('installs the pinned runtime package with %s', async (packageManager, command, args) => {
    const executor = new RecordingExecutor();

    await installMotion('my-app', options(packageManager), executor);

    expect(executor.runs).toEqual([{ command, args: [...args], cwd: 'my-app' }]);
  });

  it('does nothing when Motion is not selected', async () => {
    const executor = new RecordingExecutor();

    await installMotion('my-app', options('npm', { motion: false }), executor);

    expect(executor.runs).toEqual([]);
  });

  it('does not install packages with --skip-install', async () => {
    const executor = new RecordingExecutor();

    await installMotion('my-app', options('npm', { skipInstall: true }), executor);

    expect(executor.runs).toEqual([]);
    expect([...executor.writes.values()].join('\n')).toContain(
      '@media (prefers-reduced-motion: reduce)'
    );
  });

  it.each([
    ['next', 'app/globals.css'],
    ['astro', 'src/styles/global.css'],
  ] as const)('adds reduced-motion handling to the %s stylesheet', async (framework, suffix) => {
    const executor = new RecordingExecutor();

    await installMotion('my-app', options('npm', { framework }), executor);

    expect(
      [...executor.writes.keys()].some((file) => file.replaceAll('\\', '/').endsWith(suffix))
    ).toBe(true);
    const stylesheet = [...executor.writes.values()].join('\n');
    expect(stylesheet).toContain('[data-motion-root]');
    expect(stylesheet).toContain('animation-duration: 0.01ms !important');
    expect(stylesheet).toContain('transition-duration: 0.01ms !important');
    expect(stylesheet).not.toContain('* {\n    animation: none');
  });

  it('adds Motion safeguards when unrelated reduced-motion CSS already exists', async () => {
    const stylesheetPath = path.join('my-app', 'app', 'globals.css');
    const unrelatedCss = `@media (prefers-reduced-motion: reduce) {
  .carousel {
    animation: none;
  }
}
`;
    const executor = new RecordingExecutor({ [stylesheetPath]: unrelatedCss });

    await installMotion('my-app', options('npm'), executor);
    await installMotion('my-app', options('npm'), executor);

    const stylesheet = executor.files.get(stylesheetPath) ?? '';
    expect(stylesheet).toContain(unrelatedCss.trim());
    expect(stylesheet).toContain('[data-motion-root]');
    expect(stylesheet.match(/\[data-motion-root\],/g)).toHaveLength(1);
  });
});
