import path from 'node:path';

import {
  e2eSmokeTest,
  renderAstroUnitSmokeTest,
  renderPlaywrightConfig,
  renderPlaywrightWorkflow,
  unitSmokeTest,
  vitestConfig,
} from '../templates/files.js';
import type { CreateOptions, Executor } from '../types.js';

export async function installTestingFiles(
  projectRoot: string,
  options: Pick<CreateOptions, 'framework' | 'packageManager' | 'unit' | 'e2e'>,
  executor: Executor
) {
  if (options.unit) {
    await executor.writeFile(path.join(projectRoot, 'vitest.config.mts'), vitestConfig);
    await executor.writeFile(
      path.join(projectRoot, 'tests', 'unit', 'home.test.tsx'),
      options.framework === 'astro' ? renderAstroUnitSmokeTest() : unitSmokeTest
    );
  }

  if (options.e2e) {
    await executor.writeFile(
      path.join(projectRoot, 'playwright.config.ts'),
      renderPlaywrightConfig(options.packageManager)
    );
    await executor.writeFile(path.join(projectRoot, 'tests', 'e2e', 'home.spec.ts'), e2eSmokeTest);
    await executor.writeFile(
      path.join(projectRoot, '.github', 'workflows', 'playwright.yml'),
      renderPlaywrightWorkflow(options.packageManager)
    );
  }
}
