import { link, lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { RealExecutor } from '../src/executor.js';
import {
  installDocsAndClaude,
  mergePurrfoldMarkdown,
  PURRFOLD_MANAGED_BEGIN,
  PURRFOLD_MANAGED_END,
} from '../src/installers/docs.js';
import { designDoc, renderAgents, renderReadme } from '../src/templates/files.js';
import type { CreateOptions } from '../src/types.js';

const roots: string[] = [];

function options(framework: CreateOptions['framework'], overrides: Partial<CreateOptions> = {}) {
  return {
    targetDir: 'app',
    framework,
    packageManager: 'npm',
    ssr: false,
    unit: true,
    e2e: true,
    commitlint: true,
    ci: true,
    motion: true,
    yes: true,
    dryRun: false,
    skipInstall: true,
    shadcnArgs: [],
    mcp: true,
    ...overrides,
  } satisfies CreateOptions;
}

async function project() {
  const root = await mkdtemp(path.join(tmpdir(), 'purrfold-docs-'));
  roots.push(root);
  await mkdir(path.join(root, '.agents', 'skills'), { recursive: true });
  return root;
}

function occurrences(content: string, value: string) {
  return content.split(value).length - 1;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('generated documentation installer', () => {
  it('preserves the exact Next.js renderer output and installs the Claude assets', async () => {
    const root = await project();
    const createOptions = options('next');

    await installDocsAndClaude(root, createOptions, new RealExecutor());

    expect(await readFile(path.join(root, 'README.md'), 'utf8')).toBe(renderReadme(createOptions));
    expect(await readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe(renderAgents(createOptions));
    expect(await readFile(path.join(root, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n');
    expect(await readFile(path.join(root, 'DESIGN.md'), 'utf8')).toBe(designDoc);
    await expect(
      readFile(path.join(root, '.claude', 'hooks', 'react-doctor.ps1'))
    ).resolves.toBeTruthy();
    await expect(
      readFile(path.join(root, '.claude', 'hooks', 'project-min-evaluation.ps1'))
    ).resolves.toBeTruthy();
    await expect(readFile(path.join(root, '.claude', 'settings.json'))).resolves.toBeTruthy();
    await expect(lstat(path.join(root, '.claude', 'skills'))).resolves.toBeTruthy();
  });

  it('keeps Astro starter content and updates one idempotent managed block', async () => {
    const root = await project();
    const readmeStarter = '# Astro Starter\n\nRun the starter locally.\n';
    const agentsStarter =
      '# Astro instructions\n\n## Development\n\nUse `astro dev --background`.\n\n## Documentation\n\nRead the Astro docs.\n';
    await writeFile(path.join(root, 'README.md'), readmeStarter);
    await writeFile(path.join(root, 'AGENTS.md'), agentsStarter);

    const initial = options('astro', {
      unit: false,
      e2e: false,
      motion: false,
      mcp: false,
    });
    await installDocsAndClaude(root, initial, new RealExecutor());
    const firstReadme = await readFile(path.join(root, 'README.md'), 'utf8');
    const firstAgents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');

    expect(firstReadme.startsWith(readmeStarter)).toBe(true);
    expect(firstAgents.startsWith(agentsStarter)).toBe(true);
    expect(firstAgents).toContain('astro dev --background');
    expect(firstReadme).toContain('## Quality');
    expect(firstAgents).toContain('## Quality Gates');
    expect(firstReadme).not.toContain('# Astro Quality App');
    expect(occurrences(firstReadme, PURRFOLD_MANAGED_BEGIN)).toBe(1);
    expect(occurrences(firstAgents, PURRFOLD_MANAGED_END)).toBe(1);

    await installDocsAndClaude(root, initial, new RealExecutor());
    expect(await readFile(path.join(root, 'README.md'), 'utf8')).toBe(firstReadme);
    expect(await readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe(firstAgents);

    await installDocsAndClaude(
      root,
      options('astro', { unit: true, e2e: true, motion: true, mcp: true }),
      new RealExecutor()
    );
    const updatedReadme = await readFile(path.join(root, 'README.md'), 'utf8');
    const updatedAgents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
    expect(updatedReadme.startsWith(readmeStarter)).toBe(true);
    expect(updatedAgents.startsWith(agentsStarter)).toBe(true);
    expect(updatedReadme).toContain('Vitest and React Testing Library');
    expect(updatedReadme).toContain('Motion for React animations');
    expect(updatedAgents).toContain('test:e2e');
    expect(occurrences(updatedReadme, PURRFOLD_MANAGED_BEGIN)).toBe(1);
    expect(occurrences(updatedAgents, PURRFOLD_MANAGED_BEGIN)).toBe(1);
  });

  it('creates missing Astro Markdown files from the managed content', async () => {
    const root = await project();

    await installDocsAndClaude(root, options('astro'), new RealExecutor());
    const firstAgents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');

    expect(await readFile(path.join(root, 'README.md'), 'utf8')).toMatch(
      /^<!-- BEGIN:purrfold-managed -->\n## Quality/
    );
    expect(firstAgents).toMatch(/^<!-- BEGIN:purrfold-managed -->/);
    expect(firstAgents).toContain('# This is an Astro scaffold');
    expect(firstAgents).toContain('## Quality Gates');
    expect(occurrences(firstAgents, PURRFOLD_MANAGED_BEGIN)).toBe(1);
    expect(occurrences(firstAgents, PURRFOLD_MANAGED_END)).toBe(1);

    await installDocsAndClaude(root, options('astro'), new RealExecutor());
    expect(await readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe(firstAgents);
  });

  it('collapses duplicate managed blocks and rejects malformed markers', () => {
    const duplicate = [
      'Before',
      PURRFOLD_MANAGED_BEGIN,
      'old one',
      PURRFOLD_MANAGED_END,
      'Between',
      PURRFOLD_MANAGED_BEGIN,
      'old two',
      PURRFOLD_MANAGED_END,
      'After',
    ].join('\n');
    const merged = mergePurrfoldMarkdown(duplicate, 'new content');

    expect(occurrences(merged, PURRFOLD_MANAGED_BEGIN)).toBe(1);
    expect(occurrences(merged, PURRFOLD_MANAGED_END)).toBe(1);
    expect(merged).toContain('Before');
    expect(merged).toContain('Between');
    expect(merged).toContain('After');
    expect(merged).toContain('new content');

    expect(() => mergePurrfoldMarkdown(`Before\n${PURRFOLD_MANAGED_BEGIN}\nbroken`, 'new')).toThrow(
      'managed block markers are incomplete or out of order'
    );
    expect(() =>
      mergePurrfoldMarkdown(
        `${PURRFOLD_MANAGED_END}\nwrong order\n${PURRFOLD_MANAGED_BEGIN}`,
        'new'
      )
    ).toThrow('managed block markers are incomplete or out of order');
  });

  it('preserves CRLF outside the block and uses it inside the block', () => {
    const starter = '# Astro\r\n\r\nStarter content.\r\n';
    const merged = mergePurrfoldMarkdown(starter, '## Quality\n\nRun checks.');

    expect(merged.startsWith(starter)).toBe(true);
    expect(merged.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('does not replace an existing custom Astro CLAUDE.md', async () => {
    const root = await project();
    await writeFile(path.join(root, 'CLAUDE.md'), '# Custom Claude instructions\n');

    await installDocsAndClaude(root, options('astro'), new RealExecutor());

    expect(await readFile(path.join(root, 'CLAUDE.md'), 'utf8')).toBe(
      '# Custom Claude instructions\n'
    );
  });

  it('updates AGENTS.md in place so an Astro hardlinked CLAUDE.md stays linked', async () => {
    const root = await project();
    const agentsPath = path.join(root, 'AGENTS.md');
    const claudePath = path.join(root, 'CLAUDE.md');
    await writeFile(agentsPath, '# Astro agents\n\nUse `astro dev --background`.\n');
    await link(agentsPath, claudePath);
    const before = await lstat(agentsPath);

    await installDocsAndClaude(root, options('astro'), new RealExecutor());

    const agentsAfter = await lstat(agentsPath);
    const claudeAfter = await lstat(claudePath);
    expect(agentsAfter.ino).toBe(before.ino);
    expect(claudeAfter.ino).toBe(agentsAfter.ino);
    expect(await readFile(claudePath, 'utf8')).toBe(await readFile(agentsPath, 'utf8'));
  });

  it('preserves Astro CLAUDE.md as a symlink when the platform permits it', async () => {
    const root = await project();
    const agentsPath = path.join(root, 'AGENTS.md');
    const claudePath = path.join(root, 'CLAUDE.md');
    await writeFile(agentsPath, '# Astro agents\n\nUse `astro dev --background`.\n');

    try {
      await symlink('AGENTS.md', claudePath, 'file');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES') {
        return;
      }
      throw error;
    }

    await installDocsAndClaude(root, options('astro'), new RealExecutor());

    expect((await lstat(claudePath)).isSymbolicLink()).toBe(true);
    expect(await readFile(claudePath, 'utf8')).toBe(await readFile(agentsPath, 'utf8'));
  });

  it('creates the Astro CLAUDE.md pointer only when it is absent', async () => {
    const root = await project();

    await installDocsAndClaude(root, options('astro'), new RealExecutor());

    expect(await readFile(path.join(root, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n');
  });
});
