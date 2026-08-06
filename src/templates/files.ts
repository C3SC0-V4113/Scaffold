import versions from '../versions.json' with { type: 'json' };

import type { CreateOptions, IconLibrary, PackageManager } from '../types.js';
import { getCatRender } from './icons.js';

export const prettierConfig = `{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "embeddedLanguageFormatting": "auto",
  "tailwindStylesheet": "./app/globals.css",
  "plugins": ["prettier-plugin-tailwindcss"]
}
`;

export function renderPrettierConfig(framework: CreateOptions['framework']) {
  if (framework !== 'astro') {
    return prettierConfig;
  }

  return prettierConfig
    .replace('"tailwindStylesheet": "./app/globals.css"', '"tailwindStylesheet": "./src/styles/global.css"')
    .replace(
      '"plugins": ["prettier-plugin-tailwindcss"]',
      '"plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"]'
    );
}

export const prettierIgnore = `node_modules
.astro
.next
dist
build
coverage
out
*.min.js
*.min.css
pnpm-lock.yaml
yarn.lock
package-lock.json
# Agent skills are vendored/managed by the skills CLI (see skills-lock.json) and
# already excluded from ESLint and React Doctor; ignore the whole tree so Prettier
# never churns third-party skill content or drifts on per-skill folder names.
.agents
`;

export const gitAttributes = `* text=auto eol=lf
`;

/**
 * Merge React Doctor's required pnpm supply-chain hardening settings into an
 * existing `pnpm-workspace.yaml` (created by create-next-app) without dropping
 * keys like `ignoredBuiltDependencies`. Satisfies `react-doctor/require-pnpm-hardening`.
 */
export function mergePnpmHardening(existing: string): string {
  const settings: Array<[string, string]> = [
    ['minimumReleaseAge', 'minimumReleaseAge: 1440'],
    ['trustPolicy', 'trustPolicy: no-downgrade'],
    ['blockExoticSubdeps', 'blockExoticSubdeps: true'],
  ];

  let content = existing.replace(/\s+$/, '');
  for (const [key, line] of settings) {
    if (!new RegExp(`^${key}\\s*:`, 'm').test(content)) {
      content += `${content.length > 0 ? '\n' : ''}${line}`;
    }
  }

  const trustPolicyExclusions = ["'chokidar@4.0.3'", "'semver@6.3.1'"];
  if (!/^trustPolicyExclude\s*:/m.test(content)) {
    content += `\ntrustPolicyExclude:\n${trustPolicyExclusions
      .map((selector) => `  - ${selector}`)
      .join('\n')}`;
  } else {
    const lines = content.split(/\r?\n/);
    const headerIndex = lines.findIndex((line) => /^trustPolicyExclude\s*:/.test(line));
    let blockEnd = headerIndex + 1;
    while (blockEnd < lines.length && (/^\s+/.test(lines[blockEnd]) || lines[blockEnd] === '')) {
      blockEnd += 1;
    }
    const block = lines.slice(headerIndex + 1, blockEnd);
    const missing = trustPolicyExclusions.filter(
      (selector) => !block.some((line) => line.trim() === `- ${selector}`)
    );
    lines.splice(blockEnd, 0, ...missing.map((selector) => `  - ${selector}`));
    content = lines.join('\n');
  }

  return `${content}\n`;
}

export function mergePnpmBuildPolicy(existing: string): string {
  const required = ['esbuild', 'unrs-resolver'];
  const lines = existing.replace(/\s+$/, '').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^allowBuilds\s*:/.test(line));

  if (headerIndex === -1) {
    const prefix = lines.length === 1 && lines[0] === '' ? [] : lines;
    return `${[...prefix, 'allowBuilds:', ...required.map((name) => `  ${name}: true`)].join('\n')}\n`;
  }

  let blockEnd = headerIndex + 1;
  while (blockEnd < lines.length && (/^\s+/.test(lines[blockEnd]) || lines[blockEnd] === '')) {
    blockEnd += 1;
  }

  const block = lines.slice(headerIndex + 1, blockEnd);
  const missing = required.filter(
    (name) => !block.some((line) => new RegExp(`^\\s+${name}\\s*:`).test(line))
  );
  lines.splice(blockEnd, 0, ...missing.map((name) => `  ${name}: true`));

  return `${lines.join('\n')}\n`;
}

export function humanizeProjectName(name: string) {
  const cleaned = name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'App';
  }

  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function renderRootLayout(projectName: string) {
  const appName = humanizeProjectName(projectName);

  return `import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import type { Metadata } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '${appName}',
  description: '${appName} web application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={\`\${geistSans.variable} \${geistMono.variable} h-full antialiased\`}>
      <body className="flex min-h-full flex-col">
        {process.env.NODE_ENV === 'development' && (
          <Script src="https://unpkg.com/react-scan/dist/auto.global.js" crossOrigin="anonymous" />
        )}
        {children}
      </body>
    </html>
  );
}
`;
}

export function renderHomePage(
  projectName: string,
  iconLibrary: IconLibrary = 'lucide',
  motionEnabled = false
) {
  const appName = humanizeProjectName(projectName);
  const { importLine, markup } = getCatRender(iconLibrary);
  const motionImport = motionEnabled
    ? "\n\nimport { MotionMain } from '@/components/common/motion-main';"
    : '';
  const mainTag = motionEnabled ? 'MotionMain' : 'main';

  return `${importLine}${motionImport}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${appName}',
  description: '${appName} web application starting point.',
};

export default function Home() {
  return (
    <${mainTag} className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      ${markup}
      <h1 className="text-2xl font-semibold tracking-tight">${appName}</h1>
      <p className="text-muted-foreground text-sm">Edit app/page.tsx to start building.</p>
    </${mainTag}>
  );
}
`;
}

export function renderAstroHomeHero(
  projectName: string,
  iconLibrary: IconLibrary = 'lucide',
  motionEnabled = false
) {
  const appName = humanizeProjectName(projectName);
  const { importLine, markup } = getCatRender(iconLibrary);
  const motionImport = motionEnabled
    ? "\nimport { MotionMain } from '@/components/common/motion-main';"
    : '';
  const mainTag = motionEnabled ? 'MotionMain' : 'main';

  return `import { Button } from '@/components/ui/button';
${importLine}${motionImport}

export default function HomeHero() {
  return (
    <${mainTag} className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      ${markup}
      <h1 className="text-2xl font-semibold tracking-tight">${appName}</h1>
      <p className="text-muted-foreground text-sm">Edit src/pages/index.astro to start building.</p>
      <Button type="button">Start building</Button>
    </${mainTag}>
  );
}
`;
}

export const motionMainComponent = `'use client';

import { domAnimation, LazyMotion, m, useReducedMotion, type HTMLMotionProps } from 'motion/react';

type MotionMainProps = Omit<
  HTMLMotionProps<'main'>,
  | 'animate'
  | 'exit'
  | 'initial'
  | 'layout'
  | 'layoutId'
  | 'transition'
  | 'variants'
  | 'whileDrag'
  | 'whileFocus'
  | 'whileHover'
  | 'whileInView'
  | 'whileTap'
>;

export function MotionMain({ children, ...props }: MotionMainProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.main
        {...props}
        data-motion-root=""
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.2, ease: 'easeOut' }
        }
      >
        {children}
      </m.main>
    </LazyMotion>
  );
}
`;

export function renderAstroHomePage(projectName: string, motionEnabled = false) {
  return `---
import HomeHero from '../components/home-hero';
import Layout from '../layouts/main.astro';
---

<Layout>
  <HomeHero${motionEnabled ? ' client:load' : ''} />
</Layout>
`;
}

export const astroRootLayout = `---
import '../styles/global.css';
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    {import.meta.env.DEV && (
      <script
        is:inline
        defer
        crossorigin="anonymous"
        src="//unpkg.com/react-scan/dist/auto.global.js"
      ></script>
    )}
    <slot name="head" />
  </head>
  <body>
    <slot />
  </body>
</html>
`;

export const reactDoctorConfig = `{
  "ignore": {
    "files": [".agents/**", ".claude/**", "components/ui/**"],
    "overrides": [
      {
        "files": ["lib/utils.ts"],
        "rules": ["deslop/unused-file", "knip/exports", "exports"]
      }
    ]
  }
}
`;

export function renderReactDoctorConfig(
  framework: CreateOptions['framework'],
  motion = false
) {
  if (framework !== 'astro' && !motion) {
    return reactDoctorConfig;
  }

  if (framework !== 'astro') {
    // React Doctor 0.5.4 reports require-reduced-motion for Next App Router
    // even when app/globals.css contains the media query and the Motion wrapper
    // calls useReducedMotion(). Keep both real safeguards and suppress only
    // that verified false positive until the detector recognizes them.
    return `{
  "ignore": {
    "rules": ["react-doctor/require-reduced-motion"],
    "files": [".agents/**", ".claude/**", "components/ui/**"],
    "overrides": [
      {
        "files": ["lib/utils.ts"],
        "rules": ["deslop/unused-file", "knip/exports", "exports"]
      }
    ]
  }
}
`;
  }

  return `{
  "ignore": {
    "files": [".agents/**", ".claude/**", "src/components/ui/**"],
    "overrides": [
      {
        "files": ["src/lib/utils.ts"],
        "rules": ["deslop/unused-file", "knip/exports", "exports"]
      }
    ]
  }
}
`;
}

// .mjs + ESM syntax on purpose: Astro apps set "type": "module", so a
// commitlint.config.js with module.exports crashes there, while Next apps
// stay CommonJS. An explicit .mjs works identically in both. Named const
// because eslint-config-next warns on anonymous default exports and the
// generated check runs with --max-warnings 0.
export const commitlintConfig = `const commitlintConfig = {
  extends: ['@commitlint/config-conventional'],
};

export default commitlintConfig;
`;

export const preCommitHook = `npx lint-staged
npm run doctor:staged
`;

export const prePushHook = `npm run check
`;

export const commitMsgHook = `npx commitlint --edit $1
`;

/**
 * Action tags and runtime versions for generated workflows come from
 * src/versions.json, never from literals here. Inlined tags are how the
 * generated pipelines rotted: nothing watched them, so every app scaffolded
 * before an action's major bump kept running a deprecated runner (the symptom
 * was the actions/checkout@v4 node20 deprecation warning). Renovate has a
 * custom manager over the `actions` key so a bump is a one-line commit here.
 */
function action(name: keyof typeof versions.actions): string {
  return `${name}@${versions.actions[name]}`;
}

const NODE_VERSION = versions.toolchain.node;

interface WorkflowToolchain {
  /** Lockfile-respecting install, e.g. `npm ci`. */
  installCommand: string;
  /** Runs a package.json script, e.g. `pnpm run`. */
  runCommand: string;
  /** Runs a locally installed binary, e.g. `npx`. */
  execCommand: string;
  /** `cache:` input for setup-node; empty for bun, which setup-node cannot cache. */
  cache: string;
  /** Package-manager setup step, indented for a `steps:` list; empty for npm. */
  setupStep: string;
}

/**
 * The three package managers differ in five small ways across both workflows.
 * Deriving them once keeps quality.yml and playwright.yml from drifting apart,
 * which they already had: the two render functions carried byte-identical
 * copies of this logic.
 */
function workflowToolchain(packageManager: string): WorkflowToolchain {
  if (packageManager === 'pnpm') {
    return {
      installCommand: 'pnpm install --frozen-lockfile',
      runCommand: 'pnpm run',
      execCommand: 'pnpm exec',
      cache: '\n          cache: pnpm',
      // No `version:` input on purpose. The generated package.json carries a
      // `packageManager` field, which this action reads — and it refuses to run
      // when both are set. That also replaces the old `version: latest`, which
      // let a pnpm major land in CI with no commit to point at when it broke.
      setupStep: `      - name: Setup pnpm
        uses: ${action('pnpm/action-setup')}

`,
    };
  }

  if (packageManager === 'bun') {
    return {
      installCommand: 'bun install --frozen-lockfile',
      runCommand: 'bun run',
      execCommand: 'bunx --bun',
      cache: '',
      setupStep: `      - name: Setup Bun
        uses: ${action('oven-sh/setup-bun')}

`,
    };
  }

  return {
    installCommand: 'npm ci',
    runCommand: 'npm run',
    execCommand: 'npx',
    cache: `\n          cache: npm`,
    setupStep: '',
  };
}

export function renderQualityWorkflow(packageManager: string) {
  const { installCommand, runCommand, cache, setupStep } = workflowToolchain(packageManager);

  return `name: Quality

# Only \`main\` on push. A \`'**'\` branch filter here runs this twice for every
# push to a branch with an open PR — once for the push and once for the
# pull_request event — and the two runs are byte-identical.
on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

# Cancel superseded runs of the same branch or PR to save Actions minutes.
concurrency:
  group: quality-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: ${action('actions/checkout')}

${setupStep}      - name: Setup Node
        uses: ${action('actions/setup-node')}
        with:
          node-version: ${NODE_VERSION}${cache}

      - name: Install dependencies
        run: ${installCommand}

      - name: Run quality checks
        run: ${runCommand} check
`;
}

export function renderPlaywrightWorkflow(packageManager: string) {
  const { installCommand, execCommand, cache, setupStep } = workflowToolchain(packageManager);

  return `name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

# Cancel superseded runs of the same branch or PR to save Actions minutes.
concurrency:
  group: playwright-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: ${action('actions/checkout')}

${setupStep}      - name: Setup Node
        uses: ${action('actions/setup-node')}
        with:
          node-version: ${NODE_VERSION}${cache}

      - name: Install dependencies
        run: ${installCommand}

      # CI runs chromium only; the full firefox/webkit matrix stays on the local
      # \`test:e2e\` script. Browser binaries are cached keyed by the installed
      # @playwright/test version so a bump invalidates the cache. OS-level deps
      # are not cacheable, so on a hit we still run install-deps.
      - name: Resolve Playwright version
        id: playwright-version
        run: echo "version=$(node -p "require('@playwright/test/package.json').version")" >> "$GITHUB_OUTPUT"

      - name: Cache Playwright browsers
        id: playwright-cache
        uses: ${action('actions/cache')}
        with:
          path: ~/.cache/ms-playwright
          key: \${{ runner.os }}-playwright-chromium-\${{ steps.playwright-version.outputs.version }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: ${execCommand} playwright install --with-deps chromium

      - name: Install Playwright OS dependencies
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: ${execCommand} playwright install-deps chromium

      - name: Run Playwright tests
        run: ${execCommand} playwright test --project=chromium

      - name: Upload Playwright report
        uses: ${action('actions/upload-artifact')}
        if: \${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
`;
}

export const vitestConfig = `import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
`;

export function renderVitestConfig(framework: CreateOptions['framework']) {
  if (framework !== 'astro') {
    return vitestConfig;
  }

  return vitestConfig
    .replace("import tsconfigPaths from 'vite-tsconfig-paths';\n", '')
    .replace('  plugins: [tsconfigPaths(), react()],', '  plugins: [react()],\n  resolve: {\n    tsconfigPaths: true,\n  },');
}

export const unitSmokeTest = `import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from '@/app/page';

describe('Home page smoke test', () => {
  it('renders a heading', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });
});
`;

export function renderAstroUnitSmokeTest() {
  return `import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomeHero from '@/components/home-hero';

describe('Home hero smoke test', () => {
  it('renders a heading', () => {
    render(<HomeHero />);

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });
});
`;
}

export const motionMainUnitTest = `import { render } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const motionState = vi.hoisted(() => ({
  reduced: false,
  props: undefined as Record<string, unknown> | undefined,
}));

vi.mock('motion/react', () => ({
  domAnimation: {},
  LazyMotion: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  m: {
    main: ({
      children,
      ...props
    }: {
      children?: ReactNode;
    } & Record<string, unknown>) => {
      motionState.props = props;
      return createElement('main', null, children);
    },
  },
  useReducedMotion: () => motionState.reduced,
}));

import { MotionMain } from '@/components/common/motion-main';

describe('MotionMain', () => {
  beforeEach(() => {
    motionState.reduced = false;
    motionState.props = undefined;
  });

  it('uses a restrained entrance animation', () => {
    render(<MotionMain>Content</MotionMain>);

    expect(motionState.props).toMatchObject({
      'data-motion-root': '',
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2, ease: 'easeOut' },
    });
  });

  it('removes movement and duration when reduced motion is requested', () => {
    motionState.reduced = true;

    render(<MotionMain>Content</MotionMain>);

    expect(motionState.props).toMatchObject({
      initial: false,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    });
  });
});
`;

export const playwrightConfig = `import { defineConfig, devices } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
`;

export function renderPlaywrightConfig(packageManager: string) {
  const devCommand =
    packageManager === 'pnpm'
      ? 'pnpm run dev -- --hostname 127.0.0.1 --port 3000'
      : packageManager === 'bun'
        ? 'bun run dev -- --hostname 127.0.0.1 --port 3000'
        : 'npm run dev -- --hostname 127.0.0.1 --port 3000';

  return playwrightConfig.replace(
    "npm run dev -- --hostname 127.0.0.1 --port 3000",
    devCommand
  );
}

export const e2eSmokeTest = `import { expect, test } from '@playwright/test';

test('loads the home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toBeVisible();
});
`;

function shadcnMcpCommand(packageManager: PackageManager, client: 'claude' | 'codex' | 'opencode') {
  if (packageManager === 'pnpm') {
    return `pnpm dlx shadcn@latest mcp init --client ${client}`;
  }

  if (packageManager === 'bun') {
    return `bunx --bun shadcn@latest mcp init --client ${client}`;
  }

  return `npx shadcn@latest mcp init --client ${client}`;
}

function shadcnMcpToml(packageManager: PackageManager) {
  if (packageManager === 'pnpm') {
    return `[mcp_servers.shadcn]
command = "pnpm"
args = ["dlx", "shadcn@latest", "mcp"]`;
  }

  if (packageManager === 'bun') {
    return `[mcp_servers.shadcn]
command = "bunx"
args = ["--bun", "shadcn@latest", "mcp"]`;
  }

  return `[mcp_servers.shadcn]
command = "npx"
args = ["shadcn@latest", "mcp"]`;
}

function renderShadcnMcpGuide(options: Pick<CreateOptions, 'packageManager' | 'mcp'>) {
  const status = options.mcp
    ? 'purrfold attempted shadcn MCP setup during scaffold.'
    : 'shadcn MCP setup was not run by default because some clients may update user-level tool config.';

  return `## shadcn MCP

${status}

Manual setup commands for this package manager:

\`\`\`bash
${shadcnMcpCommand(options.packageManager, 'claude')}
${shadcnMcpCommand(options.packageManager, 'codex')}
${shadcnMcpCommand(options.packageManager, 'opencode')}
\`\`\`

Codex may require user-level configuration in \`~/.codex/config.toml\`:

\`\`\`toml
${shadcnMcpToml(options.packageManager)}
\`\`\`
`;
}

export function renderReadme(
  options: Pick<CreateOptions, 'framework' | 'packageManager' | 'unit' | 'e2e' | 'commitlint' | 'mcp' | 'motion'>
) {
  const run = options.packageManager === 'npm' ? 'npm run' : `${options.packageManager} run`;
  const frameworkName = options.framework === 'astro' ? 'Astro' : 'Next.js';
  const title = options.framework === 'astro' ? 'Astro Quality App' : 'Next Quality App';
  const toolingLines =
    options.framework === 'astro'
      ? [
          '- Astro project with TypeScript, Tailwind, and React islands.',
          '- shadcn UI initialized through the shadcn CLI.',
          '- ESLint flat config with strict Astro, React, import ordering, and Prettier integration.',
          '- React Doctor and React Scan.',
        ]
      : [
          '- Next.js App Router with TypeScript and Tailwind.',
          '- shadcn UI initialized through the shadcn CLI.',
          '- ESLint flat config with strict Next.js, React, import ordering, and Prettier integration.',
          '- React Doctor and React Scan.',
        ];

  return `# ${title}

${frameworkName} app scaffolded with strict quality tooling, shadcn, React Doctor, React Scan, agent docs, and Claude hooks.

## Development

\`\`\`bash
${run} dev
\`\`\`

## Quality

\`\`\`bash
${run} lint
${run} typecheck
${run} format:check
${options.unit ? `${run} test\n` : ''}${run} doctor
${run} check
\`\`\`

## Tooling

${toolingLines.join('\n')}
${options.unit ? '- Vitest and React Testing Library.\n' : ''}${options.e2e ? '- Playwright E2E testing.\n' : ''}${options.commitlint ? '- Conventional commit linting.\n' : ''}${options.motion ? '- Motion for React animations.\n' : ''}
${renderMotionGuide(options)}${renderShadcnMcpGuide(options)}
## shadcn Presets

purrfold forwards additional shadcn CLI arguments, including official presets:

\`\`\`bash
npx purrfold@latest my-app --shadcn-args --preset b3REw8vwo --yes
npx purrfold@latest my-app --shadcn-args --preset b1sSLwZVp --yes
npx purrfold@latest my-app --shadcn-args --preset b2qMI9ufY --yes
npx purrfold@latest my-app --shadcn-args --preset b5eH0WVTX --yes
\`\`\`

## Agent Docs

- \`AGENTS.md\`: agent workflow and quality gates.
- \`DESIGN.md\`: generic UI/UX guardrails.
- \`.agents/skills\`: local and installed skills.
- \`CLAUDE.md\`: Claude Code pointer to \`AGENTS.md\`.
`;
}

export const designDoc = `# Design Standard

This file is the UI/UX source of truth for this app.

## Principles

- Build the actual product surface first; avoid marketing-only landing pages.
- Prefer dense, calm, scannable layouts for operational tools.
- Use semantic tokens from \`app/globals.css\`.
- Keep loading, empty, error, and partial-data states explicit.
- Make controls accessible, keyboard reachable, and clearly labeled.

## Components

- Use shadcn primitives before custom markup.
- Use lucide icons for icon buttons and provide accessible labels.
- Use tables for detailed records, cards for repeated metrics, and charts only when they answer a clear comparison question.
- Do not nest cards inside cards.

## Motion

- Use subtle transitions only when they clarify state.
- Respect reduced-motion preferences for non-trivial animation.
`;

function renderMotionGuide(options: Pick<CreateOptions, 'framework' | 'motion'>) {
  if (!options.motion) {
    return '';
  }

  const frameworkGuidance =
    options.framework === 'astro'
      ? 'Astro/Vite requires no additional Motion configuration. Use Motion inside React islands.'
      : 'In the Next.js App Router, use `motion/react` from a client component or import server-compatible components from `motion/react-client`.';

  return `## Motion

Import React APIs from \`motion/react\`. ${frameworkGuidance}

- Use animation only when it clarifies state or spatial relationships.
- Prefer \`transform\` and \`opacity\` for smooth rendering.
- Respect \`prefers-reduced-motion\`; Motion's \`useReducedMotion\` can adapt non-essential movement.
- Agent guidance: \`.agents/skills/motion-framer/SKILL.md\`.
- If that external skill recommends \`framer-motion\`, this project's \`motion\` dependency and the current official Motion documentation take precedence.

`;
}

export function renderAgents(
  options: Pick<CreateOptions, 'framework' | 'packageManager' | 'unit' | 'e2e' | 'commitlint' | 'mcp' | 'motion'>
) {
  const run = options.packageManager === 'npm' ? 'npm run' : `${options.packageManager} run`;

  if (options.framework === 'astro') {
    return `<!-- BEGIN:astro-agent-rules -->

# This is an Astro scaffold

This project uses Astro. Read the current Astro docs before changing framework APIs or project structure.

<!-- END:astro-agent-rules -->

## Quality Gates

Run these before claiming implementation complete:

1. \`${run} lint\`
2. \`${run} typecheck\`
3. \`${run} format:check\`
${options.unit ? `4. \`${run} test\`\n` : ''}${options.e2e ? `- Run \`${run} test:e2e\` when E2E behavior changed.\n` : ''}- \`${run} doctor\`
- \`${run} check\`

## References

- Architecture and scripts: \`README.md\`
- Design rules: \`DESIGN.md\`
- Astro reference docs: current Astro documentation
- Astro agent rules: generated \`AGENTS.md\` / \`CLAUDE.md\`
- Component placement rules: \`.agents/skills/shadcn-component-boundaries/SKILL.md\`
- Minimum evaluation: \`.agents/skills/project-min-evaluation/SKILL.md\`
${options.unit ? '- Vitest guidance: `.agents/skills/vitest/SKILL.md`\n' : ''}${options.e2e ? '- Playwright guidance: `.agents/skills/playwright-best-practices/SKILL.md`\n' : ''}${options.commitlint ? '- Commit messages are checked with commitlint.\n' : ''}
${renderMotionAgentRules(options)}## shadcn MCP

${options.mcp ? 'shadcn MCP setup was requested during scaffold.' : 'shadcn MCP setup is optional and was not run by default.'}

\`\`\`bash
${shadcnMcpCommand(options.packageManager, 'claude')}
${shadcnMcpCommand(options.packageManager, 'codex')}
${shadcnMcpCommand(options.packageManager, 'opencode')}
\`\`\`

For Codex, verify \`~/.codex/config.toml\` if MCP is not available:

\`\`\`toml
${shadcnMcpToml(options.packageManager)}
\`\`\`

shadcn presets are supported through \`--shadcn-args --preset <id>\`.

## Claude Code

\`CLAUDE.md\` points to this file. \`.claude/skills\` should link to \`.agents/skills\`.
`;
  }

  return `<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This project uses Next.js 16 or newer. APIs and conventions may differ from model memory. Read relevant guides in \`node_modules/next/dist/docs/\` before changing Next.js code.

<!-- END:nextjs-agent-rules -->

## Quality Gates

Run these before claiming implementation complete:

1. \`${run} lint\`
2. \`${run} typecheck\`
3. \`${run} format:check\`
${options.unit ? `4. \`${run} test\`\n` : ''}${options.e2e ? `- Run \`${run} test:e2e\` when E2E behavior changed.\n` : ''}- \`${run} doctor\`
- \`${run} check\`

Do not use \`next lint\`; use the ESLint CLI.

## References

- Architecture and scripts: \`README.md\`
- Design rules: \`DESIGN.md\`
- Next.js reference docs: \`node_modules/next/dist/docs/\`
- Next.js agent rules: generated \`AGENTS.md\` / \`CLAUDE.md\`
- Purrfold-installed supported Next.js workflow skills from \`vercel/next.js\`: \`.agents/skills/next-cache-components-adoption/SKILL.md\`, \`.agents/skills/next-cache-components-optimizer/SKILL.md\`, and \`.agents/skills/next-dev-loop/SKILL.md\`
- If bundled Next.js docs are missing, run \`npx @next/codemod@canary agents-md\`.
- If Purrfold-installed supported workflow skills are missing, rerun \`./skills.sh\`.
- Component placement rules: \`.agents/skills/shadcn-component-boundaries/SKILL.md\`
- Minimum evaluation: \`.agents/skills/project-min-evaluation/SKILL.md\`
${options.unit ? '- Vitest guidance: `.agents/skills/vitest/SKILL.md`\n' : ''}${options.e2e ? '- Playwright guidance: `.agents/skills/playwright-best-practices/SKILL.md`\n' : ''}${options.commitlint ? '- Commit messages are checked with commitlint.\n' : ''}
${renderMotionAgentRules(options)}## shadcn MCP

${options.mcp ? 'shadcn MCP setup was requested during scaffold.' : 'shadcn MCP setup is optional and was not run by default.'}

\`\`\`bash
${shadcnMcpCommand(options.packageManager, 'claude')}
${shadcnMcpCommand(options.packageManager, 'codex')}
${shadcnMcpCommand(options.packageManager, 'opencode')}
\`\`\`

For Codex, verify \`~/.codex/config.toml\` if MCP is not available:

\`\`\`toml
${shadcnMcpToml(options.packageManager)}
\`\`\`

shadcn presets are supported through \`--shadcn-args --preset <id>\`.

## Claude Code

\`CLAUDE.md\` points to this file. \`.claude/skills\` should link to \`.agents/skills\`.
`;
}

function renderMotionAgentRules(options: Pick<CreateOptions, 'framework' | 'motion'>) {
  if (!options.motion) {
    return '';
  }

  const frameworkGuidance =
    options.framework === 'astro'
      ? '- Astro/Vite requires no additional Motion configuration; animate within React islands.'
      : '- In the Next.js App Router, use `motion/react` in client components or `motion/react-client` for server-compatible components.';

  return `## Motion Rules

${frameworkGuidance}
- Import current React APIs from \`motion/react\`.
- Animate purposefully, prefer \`transform\` and \`opacity\`, and respect \`prefers-reduced-motion\`.
- Read \`.agents/skills/motion-framer/SKILL.md\` for animation guidance.
- If the external skill recommends \`framer-motion\`, the installed \`motion\` dependency and current official Motion documentation take precedence.

`;
}
