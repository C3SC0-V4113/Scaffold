import { describe, expect, it } from 'vitest';

import versions from '../src/versions.json' with { type: 'json' };

import { buildScripts } from '../src/installers/config-model.js';
import { renderEslintConfig } from '../src/templates/eslint.js';
import {
  designDoc,
  gitAttributes,
  humanizeProjectName,
  mergePnpmBuildPolicy,
  mergePnpmHardening,
  motionMainComponent,
  motionMainUnitTest,
  reactDoctorConfig,
  renderAgents,
  renderAstroHomeHero,
  renderAstroHomePage,
  renderAstroRootLayout,
  renderPrettierConfig,
  renderReactDoctorConfig,
  renderVitestConfig,
  renderHomePage,
  renderPlaywrightWorkflow,
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
  it('points Astro Prettier at its actual Tailwind stylesheet', () => {
    const config = renderPrettierConfig('astro');

    expect(config).toContain('"tailwindStylesheet": "./src/styles/global.css"');
    expect(config).toContain('"prettier-plugin-astro"');
    expect(config).not.toContain('./app/globals.css');
  });

  it('uses Vite 8 native tsconfig path resolution for Astro tests', () => {
    const config = renderVitestConfig('astro');

    expect(config).toContain('tsconfigPaths: true');
    expect(config).not.toContain('vite-tsconfig-paths');
  });

  it('configures React Doctor for Astro-specific generated paths', () => {
    const config = renderReactDoctorConfig('astro');

    expect(config).toContain('"src/components/ui/**"');
    expect(config).toContain('"src/lib/utils.ts"');
    expect(config).toContain('".agents/**"');
    expect(config).toContain('".claude/**"');
    expect(config).not.toContain('"deslop/unused-dev-dependency"');
  });

  it('keeps shadcn files in Doctor diagnostic ignores without hiding them from graph analysis', () => {
    const nextConfig = JSON.parse(renderReactDoctorConfig('next')) as {
      ignore: { files: string[] };
    };
    const astroConfig = JSON.parse(renderReactDoctorConfig('astro')) as {
      ignore: { files: string[] };
    };

    expect(gitAttributes).not.toMatch(/linguist-(?:vendored|generated)/);
    expect(nextConfig.ignore.files).toEqual([
      '.agents/**',
      '.claude/**',
      'components/ui/**',
    ]);
    expect(astroConfig.ignore.files).toEqual([
      '.agents/**',
      '.claude/**',
      'src/components/ui/**',
    ]);
  });

  it('suppresses only React Doctor 0.5.4 reduced-motion false positives for Motion projects', () => {
    const config = renderReactDoctorConfig('next', true);

    expect(config).toContain('"react-doctor/require-reduced-motion"');
    expect(renderReactDoctorConfig('next', false)).not.toContain(
      'react-doctor/require-reduced-motion'
    );
  });

  it('merges the pnpm build allowlist without clobbering workspace config', () => {
    const config = mergePnpmBuildPolicy(`packages:
  - apps/*
allowBuilds:
  esbuild: true
`);

    expect(config).toContain('packages:\n  - apps/*');
    expect(config.match(/esbuild: true/g)).toHaveLength(1);
    expect(config).toContain('unrs-resolver: true');
  });

  it('decides the build scripts pnpm 11 left undecided', () => {
    // pnpm 11 writes this placeholder and then treats it as a fatal error, so
    // an entry that merely exists is not enough — the value has to be decided.
    const config = mergePnpmBuildPolicy(
      `allowBuilds:
  esbuild: set this to true or false
  workerd: set this to true or false
`,
      ['workerd']
    );

    expect(config).toContain('esbuild: true');
    expect(config).toContain('workerd: true');
    expect(config).not.toContain('set this to true or false');
  });

  it('leaves build scripts it was never asked to approve undecided', () => {
    // Deciding an arbitrary placeholder would auto-approve a postinstall
    // script nobody vetted. pnpm stopping on it is the intended outcome.
    const config = mergePnpmBuildPolicy(
      `allowBuilds:
  some-unvetted-package: set this to true or false
`
    );

    expect(config).toContain('some-unvetted-package: set this to true or false');
  });

  it('keeps a deliberate opt-out and stays idempotent', () => {
    const optedOut = `allowBuilds:
  esbuild: false
  unrs-resolver: true
`;

    expect(mergePnpmBuildPolicy(optedOut)).toContain('esbuild: false');
    expect(mergePnpmBuildPolicy(mergePnpmBuildPolicy(optedOut))).toBe(
      mergePnpmBuildPolicy(optedOut)
    );
  });

  it('pre-approves adapter-specific builds passed by the caller', () => {
    const fresh = mergePnpmBuildPolicy('', ['workerd']);
    const existing = mergePnpmBuildPolicy(
      `allowBuilds:
  esbuild: true
`,
      ['workerd']
    );

    expect(fresh).toContain('workerd: true');
    expect(existing).toContain('workerd: true');
    expect(existing.match(/esbuild: true/g)).toHaveLength(1);
    expect(mergePnpmBuildPolicy('')).not.toContain('workerd');
  });

  it('keeps pnpm trust hardening with exact transitive exceptions', () => {
    const config = mergePnpmHardening('');

    expect(config).toContain('trustPolicy: no-downgrade');
    expect(config).toContain("  - 'chokidar@4.0.3'");
    expect(config).toContain("  - 'semver@6.3.1'");
    // The policies land on an already-resolved tree, so pnpm 11's implicit
    // pre-script re-validation would fail `pnpm run lint:fix` (and the app's
    // own `check`) whenever any installed package is younger than 24h.
    expect(config).toContain('verifyDepsBeforeRun: false');
  });

  const options = {
    targetDir: 'my-app',
    framework: 'next' as const,
    packageManager: 'npm' as const,
    unit: true,
    e2e: true,
    commitlint: true,
    motion: false,
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

  it('snapshots astro docs', () => {
    const astroOptions = { ...options, framework: 'astro' as const };

    expect(renderReadme(astroOptions)).toMatchSnapshot();
    expect(renderAgents(astroOptions)).toMatchSnapshot();
  });

  it('snapshots ESLint and React Doctor config', () => {
    expect(renderEslintConfig({ framework: 'next', unit: true, e2e: true })).toMatchSnapshot();
    expect(reactDoctorConfig).toMatchSnapshot();
  });

  it('snapshots the Next ESLint config when Motion is enabled', () => {
    expect(renderEslintConfig({ framework: 'next', unit: true, e2e: true, motion: true })).toMatchSnapshot();
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

  it('uses viewport-height units in Next and Astro home templates', () => {
    const nextPage = renderHomePage('my-app');
    const astroHero = renderAstroHomeHero('my-app');

    expect(nextPage).toContain('min-h-dvh');
    expect(nextPage).not.toContain('min-h-screen');
    expect(astroHero).toContain('min-h-dvh');
    expect(astroHero).not.toContain('min-h-screen');
  });

  it('uses the official Motion imports when Motion is enabled', () => {
    const nextPage = renderHomePage('my-app', 'lucide', true);
    const astroHero = renderAstroHomeHero('my-app', 'lucide', true);

    expect(nextPage).toContain("import { MotionMain } from '@/components/common/motion-main'");
    expect(nextPage).toContain('<MotionMain');
    expect(astroHero).toContain("import { MotionMain } from '@/components/common/motion-main'");
    expect(astroHero).toContain('<MotionMain');
    expect(motionMainComponent).toContain("from 'motion/react'");
    expect(motionMainComponent).toContain('LazyMotion');
    expect(motionMainComponent).toContain('useReducedMotion');
    expect(motionMainComponent).toContain(
      'initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}'
    );
    expect(motionMainComponent).toContain('animate={{ opacity: 1, y: 0 }}');
    expect(motionMainComponent).toContain("{ duration: 0.2, ease: 'easeOut' }");
    expect(motionMainComponent).toContain('? { duration: 0 }');
    expect(motionMainComponent.indexOf('{...props}')).toBeLessThan(
      motionMainComponent.indexOf('initial={shouldReduceMotion')
    );
    expect(motionMainComponent).toContain("Omit<\n  HTMLMotionProps<'main'>");
    expect(motionMainComponent).toContain("| 'whileHover'");
  });

  it('renders an Astro ESLint config with Astro and TypeScript support', () => {
    const config = renderEslintConfig({ framework: 'astro', unit: true, e2e: true });

    expect(config).toContain("import eslintPluginAstro from 'eslint-plugin-astro'");
    expect(config).toContain("import tseslint from 'typescript-eslint'");
    expect(config).toContain('...eslintPluginAstro.configs.recommended');
    expect(config.indexOf('...tseslint.configs.recommended')).toBeLessThan(
      config.indexOf('...eslintPluginAstro.configs.recommended')
    );
    expect(config).toContain("'.astro/**'");
    expect(config).toContain("'src/components/ui/**'");
    expect(config).toContain("files: ['**/*.{jsx,tsx}']");
    expect(config).toContain('...reactDoctor.configs.recommended');
    expect(config).not.toContain('reactDoctor.configs.all');
  });

  it('keeps Next React Doctor presets scoped to recommended and Next rules', () => {
    const config = renderEslintConfig({ framework: 'next', unit: true, e2e: false });

    expect(config).toContain('reactDoctor.configs.recommended');
    expect(config).toContain('reactDoctor.configs.next');
    expect(config).not.toContain('reactDoctor.configs.all');
  });

  it('scopes App Router metadata exports away from react-doctor/only-export-components', () => {
    const nextConfig = renderEslintConfig({ framework: 'next', unit: true, e2e: true });
    const astroConfig = renderEslintConfig({ framework: 'astro', unit: true, e2e: true });

    expect(nextConfig).toContain(
      "files: ['app/**/layout.{tsx,jsx,ts,js}', 'app/**/page.{tsx,jsx,ts,js}']"
    );
    expect(nextConfig).toContain("'react-doctor/only-export-components': 'off'");
    expect(nextConfig).not.toContain("'react-doctor/require-reduced-motion': 'off'");

    expect(astroConfig).not.toContain("files: ['app/**/layout.{tsx,jsx,ts,js}'");
    expect(astroConfig).not.toContain("'react-doctor/only-export-components': 'off'");

    const nextScripts = buildScripts({ framework: 'next', packageManager: 'npm', unit: true, e2e: true });
    expect(nextScripts.lint).toContain('--max-warnings 0');
    expect(nextScripts['lint:fix']).toContain('--max-warnings 0');
  });

  it('scopes the generated Motion wrapper away from react-doctor/jsx-no-new-object-as-prop in Next and Astro', () => {
    const nextConfig = renderEslintConfig({ framework: 'next', unit: true, e2e: true, motion: true });
    const astroConfig = renderEslintConfig({ framework: 'astro', unit: true, e2e: true, motion: true });

    expect(nextConfig).toContain(`  {
    files: ['components/common/motion-main.tsx'],
    rules: {
      'react-doctor/jsx-no-new-object-as-prop': 'off',
    },
  },`);
    expect(astroConfig).toContain(`  {
    files: ['src/components/common/motion-main.tsx'],
    rules: {
      'react-doctor/jsx-no-new-object-as-prop': 'off',
    },
  },`);
    expect(nextConfig).not.toContain("files: ['src/components/common/motion-main.tsx']");
    expect(nextConfig).not.toContain("'react-doctor/jsx-no-new-object-as-prop': 'off',\n      'react-doctor/only-export-components': 'off'");
    expect(astroConfig).not.toContain("'react-doctor/jsx-no-new-object-as-prop': 'off',\n      'react-doctor/only-export-components': 'off'");
  });

  it('omits the Motion wrapper override when Motion is not selected', () => {
    const nextConfig = renderEslintConfig({ framework: 'next', unit: true, e2e: true });
    const astroConfig = renderEslintConfig({ framework: 'astro', unit: true, e2e: true });

    expect(nextConfig).not.toContain("files: ['components/common/motion-main.tsx']");
    expect(nextConfig).not.toContain("'react-doctor/jsx-no-new-object-as-prop': 'off'");
    expect(astroConfig).not.toContain("files: ['src/components/common/motion-main.tsx']");
    expect(astroConfig).not.toContain("'react-doctor/jsx-no-new-object-as-prop': 'off'");
  });

  it('renders a valid Astro app shell with an existing layout import', () => {
    const page = renderAstroHomePage('my-app');
    const hero = renderAstroHomeHero('my-app');

    expect(page).toContain("import Layout from '../layouts/main.astro'");
    expect(hero).toContain("import { Button } from '@/components/ui/button'");
    expect(hero).toContain('<Button type="button">');
    const layout = renderAstroRootLayout();

    expect(layout).toContain("import '../styles/global.css'");
    expect(layout).toContain('import.meta.env.DEV');
    expect(layout).toContain('is:inline');
    expect(layout).toContain('crossorigin="anonymous"');
    expect(layout).toContain('<slot />');
  });

  it('loads React Scan eagerly and pinned so it can patch React first', () => {
    const layout = renderAstroRootLayout();

    // `defer` (or `async`) postpones the script past React, which is exactly
    // what made the generated dev server log "Must import React Scan before
    // React runs" on every page load.
    expect(layout).not.toContain('defer');
    expect(layout).not.toContain('async');
    expect(layout).toContain(
      `//unpkg.com/react-scan@${versions.dependencies['react-scan']}/dist/auto.global.js`
    );
  });

  it('hydrates the Astro React island only when Motion is enabled', () => {
    expect(renderAstroHomePage('my-app', true)).toContain('<HomeHero client:load />');
    expect(renderAstroHomePage('my-app', false)).toContain('<HomeHero />');
    expect(renderAstroHomePage('my-app', false)).not.toContain('client:');
  });

  it('generates behavioral coverage for normal and reduced Motion preferences', () => {
    expect(motionMainUnitTest).toContain("it('uses a restrained entrance animation'");
    expect(motionMainUnitTest).toContain(
      "it('removes movement and duration when reduced motion is requested'"
    );
    expect(motionMainUnitTest).toContain("transition: { duration: 0.2, ease: 'easeOut' }");
    expect(motionMainUnitTest).toContain('transition: { duration: 0 }');
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
    expect(agents).toContain('.agents/skills/shadcn-component-boundaries/SKILL.md');
  });

  it('adds authoritative Motion guidance only when Motion is selected', () => {
    const readme = renderReadme({ ...options, motion: true });
    const agents = renderAgents({ ...options, motion: true });
    const defaultReadme = renderReadme(options);
    const defaultAgents = renderAgents(options);

    for (const document of [readme, agents]) {
      expect(document).toContain('motion/react');
      expect(document).toContain('motion/react-client');
      expect(document).toContain('prefers-reduced-motion');
      expect(document).toContain('transform');
      expect(document).toContain('opacity');
      expect(document).toContain('framer-motion');
      expect(document).toContain('.agents/skills/motion-framer/SKILL.md');
    }
    expect(readme).not.toContain('Astro/Vite requires no additional Motion configuration');
    expect(defaultReadme).not.toContain('motion/react');
    expect(defaultAgents).not.toContain('motion/react');

    const astroReadme = renderReadme({ ...options, framework: 'astro', motion: true });
    expect(astroReadme).toContain('Astro/Vite requires no additional Motion configuration');
    expect(readme).toMatchSnapshot();
    expect(agents).toMatchSnapshot();
    expect(astroReadme).toMatchSnapshot();
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

  // Structural guarantees live in workflows.test.ts; these snapshots exist so a
  // template edit shows up as a reviewable YAML diff.
  it.each(['npm', 'pnpm', 'bun'])('snapshots the %s workflows', (packageManager) => {
    expect(renderQualityWorkflow(packageManager)).toMatchSnapshot();
    expect(renderPlaywrightWorkflow(packageManager)).toMatchSnapshot();
  });

  it('snapshots Claude hooks', () => {
    expect(claudeReactDoctorHook).toMatchSnapshot();
    expect(renderClaudeProjectMinEvaluationHook('npm', true)).toMatchSnapshot();
    expect(claudeSettings).toMatchSnapshot();
  });
});
