import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ensureAstroReactIntegration,
  rewriteAstroConfigForAdapter,
  rewriteAstroTsconfigForShadcn,
} from '../src/installers/astro.js';
import type { CreateOptions, Executor } from '../src/types.js';

describe('Astro tsconfig rewrite', () => {
  it('adds the shadcn alias without clobbering React compiler options', () => {
    const current = JSON.stringify({
      extends: 'astro/tsconfigs/strict',
      compilerOptions: {
        jsx: 'react-jsx',
        jsxImportSource: 'react',
      },
    });

    const next = JSON.parse(rewriteAstroTsconfigForShadcn(current)) as {
      extends: string;
      compilerOptions: {
        jsx: string;
        jsxImportSource: string;
        baseUrl: string;
        paths: Record<string, string[]>;
      };
    };

    expect(next).toEqual({
      extends: 'astro/tsconfigs/strict',
      compilerOptions: {
        jsx: 'react-jsx',
        jsxImportSource: 'react',
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
      },
    });
  });

  it('preserves existing path aliases', () => {
    const current = JSON.stringify({
      compilerOptions: {
        paths: {
          '~/*': ['./src/*'],
        },
      },
    });

    const next = JSON.parse(rewriteAstroTsconfigForShadcn(current)) as {
      compilerOptions: { paths: Record<string, string[]> };
    };

    expect(next.compilerOptions.paths).toEqual({
      '~/*': ['./src/*'],
      '@/*': ['./src/*'],
    });
  });
});

describe('Astro adapter config rewrite', () => {
  it('inserts the adapter without clobbering existing config entries', () => {
    const current = `import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [],
  image: {
    service: 'sharp',
  },
});
`;

    const next = rewriteAstroConfigForAdapter(current, 'cloudflare');

    expect(next).toContain("import { defineConfig } from 'astro/config';");
    expect(next).toContain("import cloudflare from '@astrojs/cloudflare';");
    expect(next).toContain("output: 'server',");
    expect(next).toContain('adapter: cloudflare(),');
    expect(next).toContain('integrations: [],');
    expect(next).toContain("service: 'sharp',");
  });

  it('uses the standalone node adapter block', () => {
    const current = `import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [],
});
`;

    const next = rewriteAstroConfigForAdapter(current, 'node');

    expect(next).toContain("import node from '@astrojs/node';");
    expect(next).toContain("adapter: node({ mode: 'standalone' }),");
    expect(next).toContain('server: {');
    expect(next).toContain('host: true,');
  });

  it('fails fast when the Astro config shape is unexpected', () => {
    const current = `export default {};
`;

    expect(() => rewriteAstroConfigForAdapter(current, 'cloudflare')).toThrow(
      'Unexpected astro.config.mjs shape. Expected an Astro config with defineConfig({ ... }).'
    );
  });
});

describe('Astro React integration guard', () => {
  const projectRoot = 'my-app';
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const configPath = path.join(projectRoot, 'astro.config.mjs');

  const withReact = {
    [packageJsonPath]: JSON.stringify({ dependencies: { '@astrojs/react': '^4.0.0' } }),
    [configPath]: "import react from '@astrojs/react';\nexport default defineConfig({ integrations: [react()] });\n",
  };
  const withoutReact = {
    [packageJsonPath]: JSON.stringify({ dependencies: {} }),
    [configPath]: 'export default defineConfig({});\n',
  };
  // create-astro reported "✔ Integrations added", wrote the config, and never
  // installed the package. `astro add` cannot repair this: it loads the config
  // to edit it and dies on the missing import (issue #54).
  const configOnly = {
    [packageJsonPath]: JSON.stringify({ dependencies: {} }),
    [configPath]: withReact[configPath],
  };

  class FakeExecutor implements Executor {
    readonly runs: Array<{ command: string; args: string[]; cwd?: string }> = [];
    readonly files: Map<string, string>;

    constructor(
      initialFiles: Record<string, string>,
      private readonly onAstroAdd?: (files: Map<string, string>) => void,
      private readonly onInstall?: (files: Map<string, string>) => void
    ) {
      this.files = new Map(Object.entries(initialFiles));
    }

    /** Set to make the direct `@astrojs/react` install reject. */
    failInstall = false;

    async run(command: string, args: string[], options?: { cwd?: string }) {
      this.runs.push({ command, args, cwd: options?.cwd });
      const joined = args.join(' ');
      if (joined.includes('astro add react')) {
        this.onAstroAdd?.(this.files);
      }
      if (joined.includes('@astrojs/react')) {
        if (this.failInstall) {
          throw new Error('registry unavailable');
        }
        this.onInstall?.(this.files);
      }
    }

    async capture() {
      return undefined;
    }

    async ensureDir() {}
    async pathExists(filePath: string) {
      return this.files.has(filePath);
    }
    async readFile(filePath: string) {
      return this.files.get(filePath) ?? '';
    }
    async writeFile(filePath: string, content: string) {
      this.files.set(filePath, content ?? '');
    }
    async writeJson() {}
    async remove() {}
    async symlinkOrJunction() {}
  }

  const options = { packageManager: 'pnpm' } as CreateOptions;

  it('does nothing when create-astro delivered the React integration', async () => {
    const executor = new FakeExecutor(withReact);

    await ensureAstroReactIntegration(projectRoot, options, executor);

    expect(executor.runs).toEqual([]);
  });

  it('recovers by running astro add react when the integration is missing', async () => {
    const executor = new FakeExecutor(withoutReact, (files) => {
      files.set(packageJsonPath, withReact[packageJsonPath]);
      files.set(configPath, withReact[configPath]);
    });

    await ensureAstroReactIntegration(projectRoot, options, executor);

    expect(executor.runs).toEqual([
      {
        command: 'pnpm',
        args: ['exec', 'astro', 'add', 'react', '--yes'],
        cwd: projectRoot,
      },
    ]);
  });

  it('fails hard when the integration is still missing after recovery', async () => {
    const executor = new FakeExecutor(withoutReact);

    await expect(ensureAstroReactIntegration(projectRoot, options, executor)).rejects.toThrow(
      'The Astro React integration is missing'
    );
  });

  it('repairs a config-only state when astro add writes config and then rejects', async () => {
    const executor = new FakeExecutor(withoutReact, (files) => {
      files.set(configPath, withReact[configPath]);
      throw new Error('install timed out');
    }, (files) => {
      files.set(packageJsonPath, withReact[packageJsonPath]);
    });

    await ensureAstroReactIntegration(projectRoot, options, executor);

    expect(executor.runs.map((entry) => entry.args.join(' '))).toEqual([
      'exec astro add react --yes',
      'add @astrojs/react',
    ]);
  });

  // Issue #54: create-astro claimed success, wrote `react()` into the config,
  // and never installed the package. `astro add` cannot recover from it — the
  // config it must load imports the module that is missing.
  it('installs the dependency directly when only the config half landed', async () => {
    const executor = new FakeExecutor(configOnly, undefined, (files) => {
      files.set(packageJsonPath, withReact[packageJsonPath]);
    });

    await ensureAstroReactIntegration(projectRoot, options, executor);

    // The config already says `react()`, so the install alone completes it and
    // `astro add` never has to run.
    expect(executor.runs).toEqual([
      {
        command: 'pnpm',
        args: ['add', '@astrojs/react'],
        cwd: projectRoot,
      },
    ]);
  });

  it('still falls back to astro add when the direct install fails', async () => {
    const executor = new FakeExecutor(configOnly, (files) => {
      files.set(packageJsonPath, withReact[packageJsonPath]);
    });
    executor.failInstall = true;

    await ensureAstroReactIntegration(projectRoot, options, executor);

    // A failed install must not turn a recoverable scaffold into a failed run:
    // this path only ever adds a chance to recover.
    expect(executor.runs.map((entry) => entry.args.join(' '))).toEqual([
      'add @astrojs/react',
      'exec astro add react --yes',
    ]);
  });

  it('goes straight to astro add when the config half is missing too', async () => {
    const executor = new FakeExecutor(withoutReact, (files) => {
      files.set(packageJsonPath, withReact[packageJsonPath]);
      files.set(configPath, withReact[configPath]);
    });

    await ensureAstroReactIntegration(projectRoot, options, executor);

    // astro can load a config that does not import the missing module, so it
    // still owns this state — no direct install needed.
    expect(executor.runs.map((entry) => entry.args.join(' '))).toEqual([
      'exec astro add react --yes',
    ]);
  });
});
