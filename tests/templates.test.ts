import { describe, expect, it } from 'vitest';

import { renderEslintConfig } from '../src/templates/eslint.js';
import {
  astroRootLayout,
  designDoc,
  humanizeProjectName,
  mergePnpmHardening,
  reactDoctorConfig,
  renderAgents,
  renderAstroHomePage,
  renderHomePage,
  renderQualityWorkflow,
  renderReadme,
  renderRootLayout,
  vitestConfig,
} from '../src/templates/files.js';
import {
  claudeReactDoctorHook,
  claudeSettings,
  renderClaudeProjectMinEvaluationHook,
} from '../src/templates/hooks.js';

describe('template snapshots', () => {
  const options = {
    targetDir: 'my-app',
    framework: 'next' as const,
    packageManager: 'npm' as const,
    unit: true,
    e2e: true,
    commitlint: true,
    yes: true,
    dryRun: false,
    skipInstall: false,
    shadcnArgs: [],
    mcp: false,
  };

  it('snapshots generated docs', () => {
    expect(renderReadme(options)).toMatchSnapshot();
    expect(designDoc).toMatchSnapshot();
    expect(renderAgents(options)).toMatchSnapshot();
  });

  it('snapshots ESLint and React Doctor config', () => {
    expect(renderEslintConfig({ framework: 'next', unit: true, e2e: true })).toMatchSnapshot();
    expect(reactDoctorConfig).toMatchSnapshot();
  });

  it('produces an ESLint config that survives pnpm and ignores vendored ui', () => {
    const config = renderEslintConfig({ framework: 'next', unit: true, e2e: true });

    // eslint-config-next already registers the `import` plugin; re-registering it
    // breaks pnpm ("Cannot redefine plugin import").
    expect(config).not.toContain("from 'eslint-plugin-import'");
    expect(config).not.toMatch(/plugins:\s*{\s*import:/);
    // We still keep the ordering rules and resolver settings.
    expect(config).toContain("'import/order'");
    expect(config).toContain("'import/resolver'");
    // Generated shadcn primitives are not linted (radix/react import order, etc.).
    expect(config).toContain("'components/ui/**'");
  });

  it('keeps import plugin registration available for future base frameworks', () => {
    const config = renderEslintConfig({
      framework: 'next',
      unit: true,
      e2e: false,
      registerImportPlugin: true,
    });

    expect(config).toContain("import importPlugin from 'eslint-plugin-import'");
    expect(config).toContain('import: importPlugin');
    expect(config).toContain("'import/order'");
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

  it('renders an Astro ESLint config with Astro and TypeScript support', () => {
    const config = renderEslintConfig({ framework: 'astro', unit: true, e2e: true });

    expect(config).toContain("import eslintPluginAstro from 'eslint-plugin-astro'");
    expect(config).toContain("import tseslint from 'typescript-eslint'");
    expect(config).toContain('...eslintPluginAstro.configs.recommended');
  });

  it('renders a valid Astro app shell with an existing layout import', () => {
    const page = renderAstroHomePage('my-app');

    expect(page).toContain("import Layout from '../layouts/main.astro'");
    expect(astroRootLayout).toContain("import '../styles/global.css'");
    expect(astroRootLayout).toContain('<slot />');
  });

  it('documents shadcn MCP setup and preset compatibility', () => {
    const readme = renderReadme({ ...options, packageManager: 'pnpm', mcp: true });
    const agents = renderAgents({ ...options, packageManager: 'pnpm', mcp: true });

    expect(readme).toContain('pnpm dlx shadcn@latest mcp init --client claude');
    expect(readme).toContain('pnpm dlx shadcn@latest mcp init --client codex');
    expect(readme).toContain('pnpm dlx shadcn@latest mcp init --client opencode');
    expect(readme).toContain('~/.codex/config.toml');
    expect(readme).toContain('args = ["dlx", "shadcn@latest", "mcp"]');
    expect(readme).toContain('--shadcn-args --preset b3REw8vwo');
    expect(agents).toContain('shadcn presets are supported');
  });

  it('follows the Next.js Vitest guide with React and tsconfig-paths plugins', () => {
    expect(vitestConfig).toContain("import react from '@vitejs/plugin-react'");
    expect(vitestConfig).toContain("import tsconfigPaths from 'vite-tsconfig-paths'");
    expect(vitestConfig).toContain('plugins: [tsconfigPaths(), react()]');
  });

  it('keeps generated Vitest config imports in ESLint import/order order', () => {
    const reactIndex = vitestConfig.indexOf("import react from '@vitejs/plugin-react'");
    const tsconfigPathsIndex = vitestConfig.indexOf(
      "import tsconfigPaths from 'vite-tsconfig-paths'"
    );
    const vitestIndex = vitestConfig.indexOf("import { defineConfig } from 'vitest/config'");

    expect(reactIndex).toBeGreaterThanOrEqual(0);
    expect(tsconfigPathsIndex).toBeGreaterThan(reactIndex);
    expect(vitestIndex).toBeGreaterThan(tsconfigPathsIndex);
  });

  it('merges pnpm hardening without dropping existing keys', () => {
    const existing = 'ignoredBuiltDependencies:\n  - sharp\n  - unrs-resolver\n';
    const merged = mergePnpmHardening(existing);

    expect(merged).toContain('ignoredBuiltDependencies:');
    expect(merged).toContain('  - sharp');
    expect(merged).toContain('minimumReleaseAge:');
    expect(merged).toContain('trustPolicy: no-downgrade');
    expect(merged).toContain('blockExoticSubdeps: true');

    // Idempotent: re-merging does not duplicate keys.
    const twice = mergePnpmHardening(merged);
    expect(twice.match(/trustPolicy:/g)).toHaveLength(1);
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
