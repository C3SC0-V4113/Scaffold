import { describe, expect, it } from 'vitest';

import { renderEslintConfig } from '../src/templates/eslint.js';
import {
  designDoc,
  humanizeProjectName,
  reactDoctorConfig,
  renderAgents,
  renderHomePage,
  renderQualityWorkflow,
  renderReadme,
  renderRootLayout,
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

  it('snapshots the generated app shell', () => {
    expect(renderRootLayout('my-app')).toMatchSnapshot();
    expect(renderHomePage('my-app')).toMatchSnapshot();
  });

  it('emits a stable, lint-safe app shell', () => {
    const layout = renderRootLayout('mirador-web');
    const page = renderHomePage('mirador-web');

    // react-scan loaded via next/script (no raw <script>), single quotes, neutral metadata.
    expect(layout).toContain("import Script from 'next/script'");
    expect(layout).not.toMatch(/<script\b/);
    expect(layout).toContain("title: 'Mirador Web'");

    // page uses lucide (resolves unused-dependency) and renders an <h1> (smoke test).
    expect(page).toContain("import { Cat } from 'lucide-react'");
    expect(page).toContain('<h1');
    expect(page).toContain('export const metadata');
  });

  it('humanizes project directory names', () => {
    expect(humanizeProjectName('my-app')).toBe('My App');
    expect(humanizeProjectName('mirador_web')).toBe('Mirador Web');
    expect(humanizeProjectName('app')).toBe('App');
  });

  it('snapshots workflows and Claude hooks', () => {
    expect(renderQualityWorkflow('npm')).toMatchSnapshot();
    expect(claudeReactDoctorHook).toMatchSnapshot();
    expect(renderClaudeProjectMinEvaluationHook('npm', true)).toMatchSnapshot();
    expect(claudeSettings).toMatchSnapshot();
  });
});
