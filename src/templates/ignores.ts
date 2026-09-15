import type { CreateOptions } from '../types.js';

/**
 * Paths generated apps accumulate that no quality tool should read. Each tool
 * reads its own ignore file — Prettier 3 only the root .gitignore and
 * .prettierignore, React Doctor its doctor.config.json, `astro check` the
 * tsconfig — so every consumer lists these explicitly instead of trusting git.
 */

/**
 * Agent tooling state: Claude Code worktrees (full checkouts), the CodeGraph
 * index, and agent team scratch files.
 */
export const agentStateDirs = ['.claude/worktrees', '.codegraph', '.atl'];

/** Playwright output. Its report bundles minified trace-viewer scripts. */
export const testReportDirs = ['playwright-report', 'test-results', 'blob-report'];

/** The Cloudflare adapter's tooling writes wrangler state and generated worker types. */
export function usesCloudflareAdapter(options: Partial<Pick<CreateOptions, 'ssr' | 'astroAdapter'>>) {
  return Boolean(options.ssr) && options.astroAdapter === 'cloudflare';
}
