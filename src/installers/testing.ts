import path from 'node:path';

import { getFrameworkAdapter } from '../frameworks/registry.js';
import {
  e2eSmokeTest,
  renderPlaywrightConfig,
  motionMainUnitTest,
} from '../templates/files.js';
import type { CreateOptions, Executor } from '../types.js';

export async function installTestingFiles(
  projectRoot: string,
  options: Pick<CreateOptions, 'framework' | 'packageManager' | 'unit' | 'e2e' | 'motion' | 'router'>,
  executor: Executor
) {
  const adapter = getFrameworkAdapter(options.framework);
  if (options.unit) {
    await executor.writeFile(
      path.join(projectRoot, adapter.layout.vitestConfigPath),
      adapter.templates.vitest(options)
    );
    await executor.writeFile(
      path.join(projectRoot, 'tests', 'unit', 'home.test.tsx'),
      adapter.templates.unitSmokeTest(options)
    );
    if (options.motion) {
      await executor.writeFile(
        path.join(projectRoot, 'tests', 'unit', 'motion-main.test.tsx'),
        motionMainUnitTest
      );
    }
  }

  if (options.e2e) {
    await executor.writeFile(
      path.join(projectRoot, 'playwright.config.ts'),
      renderPlaywrightConfig(options.packageManager, adapter.playwrightServer)
    );
    await executor.writeFile(
      path.join(projectRoot, 'tests', 'e2e', 'home.spec.ts'),
      adapter.templates.e2eSmokeTest?.(options) ?? e2eSmokeTest,
    );
  }
}
