import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsRoot = join(repoRoot, 'skills');

// Skills this repository publishes for `npx skills add C3SC0-V4113/Scaffold --skill <name>`.
// They are fetched from GitHub by generated apps, so every one must be self-contained:
// no purrfold template substitutions, and no reference that escapes its own directory.
const publishedSkills = [
  'project-architecture',
  'shadcn-component-boundaries',
  'project-min-evaluation',
  'decision-doc-sync',
] as const;

const requiredSections = [
  '## Activation Contract',
  '## Hard Rules',
  '## Decision Gates',
  '## Execution Steps',
  '## Output Contract',
  '## References',
];

interface ParsedSkill {
  frontmatter: string;
  body: string;
}

function readSkill(name: string): ParsedSkill {
  const text = readFileSync(join(skillsRoot, name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) {
    throw new Error(`${name}/SKILL.md has no frontmatter block`);
  }
  return { frontmatter: match[1], body: match[2] };
}

function frontmatterValue(frontmatter: string, key: string): string | undefined {
  const match = new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm').exec(frontmatter);
  return match?.[1].trim().replace(/^"(.*)"$/, '$1');
}

/** Relative Markdown link targets, e.g. `references/next.md` from `[x](references/next.md)`. */
function relativeLinks(markdown: string): string[] {
  return [...markdown.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)]
    .map((match) => match[1])
    .filter((target) => !/^[a-z]+:/i.test(target));
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

describe('published skills', () => {
  describe.each(publishedSkills)('%s', (name) => {
    it('has complete, discoverable frontmatter', () => {
      const { frontmatter } = readSkill(name);

      expect(frontmatterValue(frontmatter, 'name')).toBe(name);
      const description = frontmatterValue(frontmatter, 'description') ?? '';
      expect(description).toMatch(/^Trigger: /);
      expect(description.length).toBeLessThanOrEqual(250);
      expect(frontmatter).toMatch(/^description: ".*"$/m);
      expect(frontmatterValue(frontmatter, 'license')).toBe('Apache-2.0');
      expect(frontmatterValue(frontmatter, 'author')).toBe('purrfold');
      expect(frontmatterValue(frontmatter, 'version')).toBe('1.0');
    });

    it('declares every runtime contract section in order', () => {
      const { body } = readSkill(name);
      const positions = requiredSections.map((section) => body.indexOf(`\n${section}\n`));

      for (const [index, position] of positions.entries()) {
        expect(position, `${requiredSections[index]} missing`).toBeGreaterThan(-1);
      }
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it('carries a decision table', () => {
      const { body } = readSkill(name);
      const gates = body.slice(body.indexOf('## Decision Gates'), body.indexOf('## Execution Steps'));

      expect(gates).toMatch(/^\|.*\|\n\| ?-+/m);
    });

    it('contains no purrfold template substitutions', () => {
      const text = readFileSync(join(skillsRoot, name, 'SKILL.md'), 'utf8');

      expect(text).not.toContain('${');
      expect(text).not.toMatch(/\{\{.*\}\}/);
    });

    it('only references files inside its own directory', () => {
      const skillDir = join(skillsRoot, name);
      const markdownFiles = filesUnder(skillDir).filter((file) => file.endsWith('.md'));
      const { body } = readSkill(name);

      expect(relativeLinks(body).length, 'SKILL.md should link its references').toBeGreaterThan(0);

      for (const file of markdownFiles) {
        for (const link of relativeLinks(readFileSync(file, 'utf8'))) {
          const target = resolve(dirname(file), link);
          expect(relative(skillDir, target).startsWith('..'), `${link} escapes ${name}`).toBe(false);
          expect(existsSync(target), `${relative(skillDir, file)} links missing ${link}`).toBe(true);
        }
      }
    });
  });

  describe('content decisions', () => {
    it('project-architecture decides between Next.js and Astro from the project itself', () => {
      const text = readSkill('project-architecture').body;

      expect(text).toContain('package.json');
      expect(text).toMatch(/next\.config/);
      expect(text).toMatch(/astro\.config/);
      expect(text).toContain('references/next.md');
      expect(text).toContain('references/astro.md');
    });

    it('project-min-evaluation discovers the package manager and existing scripts', () => {
      const text = readSkill('project-min-evaluation').body;

      for (const lockfile of ['package-lock.json', 'pnpm-lock.yaml', 'bun.lock']) {
        expect(text).toContain(lockfile);
      }
      expect(text).toContain('packageManager');
      expect(text).toMatch(/scripts/);
      for (const script of ['lint', 'typecheck', 'format:check', 'test', 'doctor', 'check']) {
        expect(text).toContain(`\`${script}\``);
      }
      // A hardcoded runner would break pnpm and bun projects.
      expect(text).not.toMatch(/^npm run /m);
    });

    it('shadcn-component-boundaries resolves paths from components.json', () => {
      const text = readSkill('shadcn-component-boundaries').body;

      expect(text).toContain('components.json');
      expect(text).toContain('aliases');
      expect(text).toContain('shadcn/no-restyle');
    });

    it('decision-doc-sync only updates documentation that exists', () => {
      const text = readSkill('decision-doc-sync').body;

      for (const doc of ['README.md', 'DESIGN.md', 'AGENTS.md', 'docs/adr/']) {
        expect(text).toContain(doc);
      }
      expect(text).toMatch(/exist/);
    });
  });

  describe('local installation', () => {
    const project = mkdtempSync(join(tmpdir(), 'purrfold-skills-'));

    afterAll(() => {
      rmSync(project, { recursive: true, force: true });
    });

    // Mirrors `skills add --copy`: the skill directory is copied verbatim into the
    // project, so everything it needs must travel with it.
    it.each(publishedSkills)('%s survives a copy into .agents/skills', (name) => {
      const source = join(skillsRoot, name);
      const target = join(project, '.agents', 'skills', name);
      cpSync(source, target, { recursive: true });

      const copied = filesUnder(target).map((file) => relative(target, file).replace(/\\/g, '/'));
      const original = filesUnder(source).map((file) => relative(source, file).replace(/\\/g, '/'));

      expect(copied).toContain('SKILL.md');
      expect(copied.some((file) => file.startsWith('references/'))).toBe(true);
      expect(copied.sort()).toEqual(original.sort());

      for (const link of relativeLinks(readFileSync(join(target, 'SKILL.md'), 'utf8'))) {
        expect(existsSync(resolve(target, link)), `${name}: ${link}`).toBe(true);
      }
    });
  });
});
