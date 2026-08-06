import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { appendGitIgnore } from '../src/installers/quality.js';
import type { AstroServerAdapter, CreateOptions, Executor } from '../src/types.js';

const projectRoot = 'my-app';
const gitIgnorePath = path.join(projectRoot, '.gitignore');

/** What create-astro leaves behind before purrfold appends to it. */
const astroStarterGitIgnore = `# build output
dist/
# generated types
.astro/
# dependencies
node_modules/
`;

class FakeExecutor implements Executor {
  readonly files: Map<string, string>;

  constructor(initialFiles: Record<string, string> = {}) {
    this.files = new Map(Object.entries(initialFiles));
  }

  async run() {}
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

function buildOptions(overrides: Partial<CreateOptions> = {}): CreateOptions {
  return {
    framework: 'astro',
    ssr: false,
    ...overrides,
  } as CreateOptions;
}

async function renderGitIgnore(
  options: CreateOptions,
  initial: Record<string, string> = { [gitIgnorePath]: astroStarterGitIgnore }
) {
  const executor = new FakeExecutor(initial);
  await appendGitIgnore(projectRoot, options, executor);
  return (executor.files.get(gitIgnorePath) ?? '').split('\n');
}

const baseEntries = ['.claude/skills/', '.react-scan/', 'playwright-report/', 'test-results/'];
const cloudflareEntries = ['.wrangler/', '.dev.vars', 'worker-configuration.d.ts'];

describe('generated .gitignore', () => {
  it('always appends the entries purrfold itself creates', async () => {
    const lines = await renderGitIgnore(buildOptions());

    expect(lines).toEqual(expect.arrayContaining(baseEntries));
  });

  it('preserves what the upstream scaffolder already wrote', async () => {
    const lines = await renderGitIgnore(buildOptions());

    expect(lines).toEqual(expect.arrayContaining(['dist/', '.astro/', 'node_modules/']));
  });

  it('never writes the same entry twice when one is already present', async () => {
    const lines = await renderGitIgnore(
      buildOptions({ ssr: true, astroAdapter: 'cloudflare' }),
      { [gitIgnorePath]: `${astroStarterGitIgnore}.wrangler/\ntest-results/\n` }
    );

    for (const entry of [...baseEntries, ...cloudflareEntries]) {
      expect(lines.filter((line) => line === entry)).toHaveLength(1);
    }
  });

  it('works when the scaffolder left no .gitignore at all', async () => {
    const lines = await renderGitIgnore(buildOptions(), {});

    expect(lines).toEqual(expect.arrayContaining(baseEntries));
  });
});

describe('Cloudflare adapter .gitignore entries', () => {
  it('ignores wrangler state and the .dev.vars secrets file for the Cloudflare adapter', async () => {
    const lines = await renderGitIgnore(buildOptions({ ssr: true, astroAdapter: 'cloudflare' }));

    expect(lines).toEqual(expect.arrayContaining(cloudflareEntries));
  });

  // The entries are gated because purrfold only ignores what purrfold creates.
  // Without the adapter there is no wrangler state to ignore.
  it.each<AstroServerAdapter>(['node', 'vercel', 'netlify'])(
    'omits them for the %s adapter',
    async (astroAdapter) => {
      const lines = await renderGitIgnore(buildOptions({ ssr: true, astroAdapter }));

      for (const entry of cloudflareEntries) {
        expect(lines).not.toContain(entry);
      }
    }
  );

  it('omits them for Astro without SSR', async () => {
    const lines = await renderGitIgnore(buildOptions({ ssr: false, astroAdapter: undefined }));

    for (const entry of cloudflareEntries) {
      expect(lines).not.toContain(entry);
    }
  });

  it('omits them for Next.js', async () => {
    const lines = await renderGitIgnore(buildOptions({ framework: 'next', ssr: false }));

    for (const entry of cloudflareEntries) {
      expect(lines).not.toContain(entry);
    }
  });
});
