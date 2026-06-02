import { describe, expect, it } from 'vitest';

import { renderEslintConfig } from '../src/templates/eslint.js';
import {
  designDoc,
  reactDoctorConfig,
  renderAgents,
  renderQualityWorkflow,
  renderReadme,
} from '../src/templates/files.js';
import {
  claudeReactDoctorHook,
  claudeSettings,
  renderClaudeProjectMinEvaluationHook,
} from '../src/templates/hooks.js';

describe('template snapshots', () => {
  const options = {
    targetDir: 'my-app',
    packageManager: 'npm' as const,
    unit: true,
    e2e: true,
    commitlint: true,
    yes: true,
    dryRun: false,
    skipInstall: false,
    shadcnArgs: [],
  };

  it('snapshots generated docs', () => {
    expect(renderReadme(options)).toMatchSnapshot();
    expect(designDoc).toMatchSnapshot();
    expect(renderAgents(options)).toMatchSnapshot();
  });

  it('snapshots ESLint and React Doctor config', () => {
    expect(renderEslintConfig({ unit: true, e2e: true })).toMatchSnapshot();
    expect(reactDoctorConfig).toMatchSnapshot();
  });

  it('snapshots workflows and Claude hooks', () => {
    expect(renderQualityWorkflow('npm')).toMatchSnapshot();
    expect(claudeReactDoctorHook).toMatchSnapshot();
    expect(renderClaudeProjectMinEvaluationHook('npm', true)).toMatchSnapshot();
    expect(claudeSettings).toMatchSnapshot();
  });
});
