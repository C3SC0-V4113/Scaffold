import type { CreateOptions } from '../types.js';

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
.agents/skills/architecture-decision-records
.agents/skills/composition-patterns
.agents/skills/next-best-practices
.agents/skills/playwright-best-practices
.agents/skills/playwright-cli
.agents/skills/react-best-practices
.agents/skills/shadcn
.agents/skills/systematic-debugging
.agents/skills/typescript-advanced-types
.agents/skills/vitest
.agents/skills/verification-before-completion
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

export const vitestConfig = `import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: '@', replacement: rootDirectory }],
  },
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

export function renderReadme(
  options: Pick<CreateOptions, 'packageManager' | 'unit' | 'e2e' | 'commitlint'>
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
  options: Pick<CreateOptions, 'packageManager' | 'unit' | 'e2e' | 'commitlint'>
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
- Next.js guidance: \`.agents/skills/next-best-practices/SKILL.md\`
- Minimum evaluation: \`.agents/skills/project-min-evaluation/SKILL.md\`
${options.unit ? '- Vitest guidance: `.agents/skills/vitest/SKILL.md`\n' : ''}${options.e2e ? '- Playwright guidance: `.agents/skills/playwright-best-practices/SKILL.md`\n' : ''}${options.commitlint ? '- Commit messages are checked with commitlint.\n' : ''}
## Claude Code

\`CLAUDE.md\` points to this file. \`.claude/skills\` should link to \`.agents/skills\`.
`;
}
