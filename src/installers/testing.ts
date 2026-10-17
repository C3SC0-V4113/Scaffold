import path from 'node:path';

import { writeFeatureFiles } from '../features/registry.js';
import { getFrameworkAdapter } from '../frameworks/registry.js';
import {
  e2eSmokeTest,
  renderPlaywrightConfig,
} from '../templates/files.js';
import type { CreateOptions, Executor } from '../types.js';

export async function installTestingFiles(
  projectRoot: string,
  options: CreateOptions,
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
    await writeFeatureFiles({
      adapter,
      options,
      executor,
      projectRoot,
      stage: 'unit-tests',
    });
  }

  if (options.e2e) {
    await executor.writeFile(
      path.join(projectRoot, 'playwright.config.ts'),
      renderPlaywrightConfig(options.packageManager, adapter.playwrightServer, {
        ssr: options.ssr,
        staticBuild: adapter.playwrightServer.staticBuild,
      })
    );
    await executor.writeFile(
      path.join(projectRoot, 'tests', 'e2e', 'home.spec.ts'),
      adapter.templates.e2eSmokeTest?.(options) ?? e2eSmokeTest,
    );
  }
}
