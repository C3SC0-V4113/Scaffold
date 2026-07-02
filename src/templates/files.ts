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

export const prettierIgnore = `node_modules
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

  return `${content}\n`;
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

export function renderHomePage(projectName: string, iconLibrary: IconLibrary = 'lucide') {
  const appName = humanizeProjectName(projectName);
  const { importLine, markup } = getCatRender(iconLibrary);

  return `${importLine}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${appName}',
  description: '${appName} web application starting point.',
};

export default function Home() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      ${markup}
      <h1 className="text-2xl font-semibold tracking-tight">${appName}</h1>
      <p className="text-muted-foreground text-sm">Edit app/page.tsx to start building.</p>
    </main>
  );
}
`;
}

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

export const commitlintConfig = `module.exports = {
  extends: ['@commitlint/config-conventional'],
};
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
  options: Pick<CreateOptions, 'packageManager' | 'unit' | 'e2e' | 'commitlint' | 'mcp'>
) {
  const run = options.packageManager === 'npm' ? 'npm run' : `${options.packageManager} run`;

  return `# Next Quality App

Next.js app scaffolded with strict quality tooling, shadcn, React Doctor, React Scan, agent docs, and Claude hooks.

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

- Next.js App Router with TypeScript and Tailwind.
- shadcn UI initialized through the shadcn CLI.
- ESLint flat config with strict Next.js, React, import ordering, and Prettier integration.
- React Doctor and React Scan.
${options.unit ? '- Vitest and React Testing Library.\n' : ''}${options.e2e ? '- Playwright E2E testing.\n' : ''}${options.commitlint ? '- Conventional commit linting.\n' : ''}
${renderShadcnMcpGuide(options)}
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

export function renderAgents(
  options: Pick<CreateOptions, 'packageManager' | 'unit' | 'e2e' | 'commitlint' | 'mcp'>
) {
  const run = options.packageManager === 'npm' ? 'npm run' : `${options.packageManager} run`;

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
- Next.js workflow skills: \`.agents/skills/next-cache-components-adoption/SKILL.md\`, \`.agents/skills/next-cache-components-optimizer/SKILL.md\`, and \`.agents/skills/next-dev-loop/SKILL.md\`
- If bundled Next.js docs are missing, run \`npx @next/codemod@canary agents-md\`.
- Minimum evaluation: \`.agents/skills/project-min-evaluation/SKILL.md\`
${options.unit ? '- Vitest guidance: `.agents/skills/vitest/SKILL.md`\n' : ''}${options.e2e ? '- Playwright guidance: `.agents/skills/playwright-best-practices/SKILL.md`\n' : ''}${options.commitlint ? '- Commit messages are checked with commitlint.\n' : ''}
## shadcn MCP

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
