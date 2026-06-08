import { describe, expect, it } from 'vitest';

import {
  buildSkillInstallCommands,
  renderSkillsScript,
  selectSkillNames,
} from '../src/installers/skills.js';
import {
  renderDecisionDocSyncSkill,
  renderProjectArchitectureSkill,
  renderProjectMinEvaluationSkill,
} from '../src/templates/skills.js';

describe('skill selection', () => {
  it('selects always-on skills', () => {
    expect(selectSkillNames({ unit: false, e2e: false })).toEqual(
      expect.arrayContaining([
        'architecture-decision-records',
        'next-best-practices',
        'project-architecture',
        'project-min-evaluation',
        'react-doctor',
        'shadcn',
        'verification-before-completion',
      ])
    );
  });

  it('adds Vitest and Playwright skills only when selected', () => {
    expect(selectSkillNames({ unit: true, e2e: true })).toEqual(
      expect.arrayContaining(['vitest', 'playwright-best-practices', 'playwright-cli'])
    );
    expect(selectSkillNames({ unit: false, e2e: false })).not.toEqual(
      expect.arrayContaining(['vitest', 'playwright-best-practices', 'playwright-cli'])
    );
  });
});

describe('external skill install script', () => {
  it('renders npx skills commands grouped by source', () => {
    const script = renderSkillsScript({ unit: false, e2e: false });

    expect(script).toContain(
      'npx --yes skills@latest add vercel-labs/agent-skills --skill composition-patterns --skill react-best-practices --agent codex --copy --yes'
    );
    expect(script).toContain('--agent codex --copy --yes');
    expect(script).not.toContain('skills-lock.json');
  });

  it('adds Vitest and Playwright install commands only when selected', () => {
    const selectedCommands = buildSkillInstallCommands({ unit: true, e2e: true });
    const unselectedScript = renderSkillsScript({ unit: false, e2e: false });
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
});

describe('local skill templates', () => {
  it('generates package-manager-specific minimum evaluation commands', () => {
    const skill = renderProjectMinEvaluationSkill({ packageManager: 'bun', unit: true, e2e: true });

    expect(skill).toContain('bun run test');
    expect(skill).toContain('bun run check');
    expect(skill).toContain('bun run test:e2e');
  });

  it('snapshots generic local skills', () => {
    expect(renderProjectArchitectureSkill()).toMatchSnapshot();
    expect(renderDecisionDocSyncSkill()).toMatchSnapshot();
  });
});
