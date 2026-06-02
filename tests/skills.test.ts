import { describe, expect, it } from 'vitest';

import { selectSkillNames } from '../src/installers/skills.js';
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
