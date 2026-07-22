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
    "rules": ["deslop/unused-dev-dependency"],
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

export function renderQualityWorkflow(packageManager: string) {
  const installCommand =
    packageManager === 'pnpm'
      ? 'pnpm install --frozen-lockfile'
      : packageManager === 'bun'
        ? 'bun install --frozen-lockfile'
        : 'npm ci';
  const checkCommand =
    packageManager === 'pnpm'
      ? 'pnpm run check'
      : packageManager === 'bun'
        ? 'bun run check'
        : 'npm run check';
  const cache = packageManager === 'bun' ? '' : `\n          cache: ${packageManager}`;
  const setupPackageManager =
    packageManager === 'pnpm'
      ? `
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest
`
      : packageManager === 'bun'
        ? `
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
`
        : '';

  return `name: Quality

on:
  push:
    branches:
      - '**'
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
${setupPackageManager}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22${cache}

      - name: Install dependencies
        run: ${installCommand}

      - name: Run quality checks
        run: ${checkCommand}
`;
}

export function renderPlaywrightWorkflow(packageManager: string) {
  const installCommand =
    packageManager === 'pnpm'
      ? 'pnpm install --frozen-lockfile'
      : packageManager === 'bun'
        ? 'bun install --frozen-lockfile'
        : 'npm ci';
  const installBrowsersCommand =
    packageManager === 'pnpm'
      ? 'pnpm exec playwright install --with-deps'
      : packageManager === 'bun'
        ? 'bunx --bun playwright install --with-deps'
        : 'npx playwright install --with-deps';
  const testCommand =
    packageManager === 'pnpm'
      ? 'pnpm exec playwright test'
      : packageManager === 'bun'
        ? 'bunx --bun playwright test'
        : 'npx playwright test';
  const cache = packageManager === 'bun' ? '' : `\n          cache: ${packageManager}`;
  const setupPackageManager =
    packageManager === 'pnpm'
      ? `
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest
`
      : packageManager === 'bun'
        ? `
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
`
        : '';

  return `name: Playwright Tests
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${setupPackageManager}
      - uses: actions/setup-node@v4
        with:
          node-version: 22${cache}
      - name: Install dependencies
        run: ${installCommand}
      - name: Install Playwright Browsers
        run: ${installBrowsersCommand}
      - name: Run Playwright tests
        run: ${testCommand}
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
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
