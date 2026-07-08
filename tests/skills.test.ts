import { describe, expect, it, vi } from 'vitest';

import {
  buildSkillInstallCommands,
  installSkills,
  renderSkillsScript,
  selectSkillNames,
} from '../src/installers/skills.js';
import {
  renderDecisionDocSyncSkill,
  renderProjectArchitectureSkill,
  renderProjectMinEvaluationSkill,
} from '../src/templates/skills.js';
import type { Executor } from '../src/types.js';

class FailingRunExecutor implements Executor {
  readonly writes = new Map<string, string>();

  async run() {
    throw new Error('network unavailable');
  }

  async ensureDir() {}

  async pathExists() {
    return false;
  }

  async readFile() {
    return '';
  }

  async writeFile(path: string, content: string) {
    this.writes.set(path, content);
  }

  async writeJson() {}

  async remove() {}

  async symlinkOrJunction() {}
}

describe('skill selection', () => {
  it('selects always-on skills', () => {
    expect(selectSkillNames({ framework: 'next', unit: false, e2e: false })).toEqual(
      expect.arrayContaining([
        'architecture-decision-records',
        'next-cache-components-adoption',
        'next-cache-components-optimizer',
        'next-dev-loop',
        'project-architecture',
        'project-min-evaluation',
        'react-doctor',
        'shadcn',
        'verification-before-completion',
      ])
    );
    expect(selectSkillNames({ framework: 'next', unit: false, e2e: false })).not.toEqual(
      expect.arrayContaining(['next-best-practices'])
    );
  });

  it('adds Vitest and Playwright skills only when selected', () => {
    expect(selectSkillNames({ framework: 'next', unit: true, e2e: true })).toEqual(
      expect.arrayContaining(['vitest', 'playwright-best-practices', 'playwright-cli'])
    );
    expect(selectSkillNames({ framework: 'next', unit: false, e2e: false })).not.toEqual(
      expect.arrayContaining(['vitest', 'playwright-best-practices', 'playwright-cli'])
    );
  });

  it('drops Next-only workflow skills for Astro', () => {
    expect(selectSkillNames({ framework: 'astro', unit: false, e2e: false })).not.toEqual(
      expect.arrayContaining([
        'next-cache-components-adoption',
        'next-cache-components-optimizer',
        'next-dev-loop',
      ])
    );
  });
});

describe('external skill install script', () => {
  it('renders npx skills commands grouped by source', () => {
    const script = renderSkillsScript({ framework: 'next', unit: false, e2e: false });

    expect(script).toContain(
      'npx --yes skills@latest add https://github.com/vercel-labs/agent-skills --skill vercel-composition-patterns --skill vercel-react-best-practices --agent codex --copy --yes'
    );
    expect(script).toContain(
      'npx --yes skills@latest add vercel/next.js --skill next-cache-components-adoption --skill next-cache-components-optimizer --skill next-dev-loop --agent codex --copy --yes'
    );
    expect(script).not.toContain('next-best-practices');
    expect(script).toContain('--agent codex --copy --yes');
    expect(script).not.toContain('skills-lock.json');
  });

  it('omits Next-only skill commands for Astro', () => {
    const script = renderSkillsScript({ framework: 'astro', unit: false, e2e: false });

    expect(script).toContain(
      'npx --yes skills@latest add https://github.com/astrolicious/agent-skills --skill astro --agent codex --copy --yes'
    );
    expect(script).not.toContain('next-cache-components-adoption');
    expect(script).not.toContain('next-cache-components-optimizer');
    expect(script).not.toContain('next-dev-loop');
  });

  it('adds Vitest and Playwright install commands only when selected', () => {
    const selectedCommands = buildSkillInstallCommands({ framework: 'next', unit: true, e2e: true });
    const unselectedScript = renderSkillsScript({ framework: 'next', unit: false, e2e: false });
    const selectedScript = selectedCommands
      .map(({ command, args }) => [command, ...args].join(' '))
      .join('\n');

    expect(selectedScript).toContain('pproenca/dot-skills --skill vitest');
    expect(selectedScript).toContain(
      'currents-dev/playwright-best-practices-skill --skill playwright-best-practices'
    );
    expect(selectedScript).toContain('microsoft/playwright-cli --skill playwright-cli');
    expect(unselectedScript).not.toContain('--skill vitest');
    expect(unselectedScript).not.toContain('--skill playwright-best-practices');
    expect(unselectedScript).not.toContain('--skill playwright-cli');
  });

  it('continues project setup when an external skill install fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const executor = new FailingRunExecutor();

    await expect(
      installSkills(
        'my-app',
        {
          targetDir: 'my-app',
          framework: 'next',
          packageManager: 'npm',
          unit: false,
          e2e: false,
          commitlint: false,
          yes: true,
          dryRun: false,
          skipInstall: false,
          shadcnArgs: [],
          mcp: false,
        },
        executor
      )
    ).resolves.toBeUndefined();

    expect([...executor.writes.keys()]).toEqual(
      expect.arrayContaining([
        expect.stringContaining('project-architecture'),
        expect.stringContaining('skills.sh'),
      ])
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping external skill install'));
  });
});

describe('local skill templates', () => {
  it('generates package-manager-specific minimum evaluation commands', () => {
    const skill = renderProjectMinEvaluationSkill({ framework: 'next', packageManager: 'bun', unit: true, e2e: true });

    expect(skill).toContain('bun run test');
    expect(skill).toContain('bun run check');
    expect(skill).toContain('bun run test:e2e');
  });

  it('snapshots generic local skills', () => {
    expect(renderProjectArchitectureSkill({ framework: 'next' })).toMatchSnapshot();
    expect(renderProjectArchitectureSkill({ framework: 'astro' })).toMatchSnapshot();
    expect(renderDecisionDocSyncSkill()).toMatchSnapshot();
  });
});
