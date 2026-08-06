import path from 'node:path';

import { renderPlaywrightWorkflow, renderQualityWorkflow } from '../templates/files.js';
import type { CreateOptions, Executor } from '../types.js';

/**
 * Sole owner of `.github/workflows/` in the generated app.
 *
 * The workflows used to be written from two unrelated installers — quality.yml
 * unconditionally from the quality layer, playwright.yml from the testing
 * layer — which made "does this app get CI?" a question with no single answer
 * and left quality.yml as the CLI's only ungated side effect on `.github/`.
 *
 * Gating rules:
 * - `--ci` decides whether the directory is written at all.
 * - `--e2e` still decides whether playwright.yml is among the files, so
 *   `--e2e` without `--ci` yields Playwright config and tests but no workflow.
 */
export async function installCiWorkflows(
  projectRoot: string,
  options: Pick<CreateOptions, 'packageManager' | 'ci' | 'e2e'>,
  executor: Executor
) {
  if (!options.ci) {
    return;
  }

  await executor.writeFile(
    path.join(projectRoot, '.github', 'workflows', 'quality.yml'),
    renderQualityWorkflow(options.packageManager)
  );

  if (options.e2e) {
    await executor.writeFile(
      path.join(projectRoot, '.github', 'workflows', 'playwright.yml'),
      renderPlaywrightWorkflow(options.packageManager)
    );
  }
}
