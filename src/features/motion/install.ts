import path from 'node:path';

import { getPackageManagerCommands } from '../../package-manager.js';
import type { FeatureModule } from '../types.js';
import { pinnedSpecifier } from '../../installers/config-model.js';

const reducedMotionCss = `
@media (prefers-reduced-motion: reduce) {
  :root {
    scroll-behavior: auto;
  }

  [data-motion-root],
  [data-motion-root] *,
  [data-motion-root] *::before,
  [data-motion-root] *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

export async function installMotion({ adapter, options, executor, projectRoot }: Parameters<FeatureModule['install']>[0]) {
  if (!options.motion) {
    return;
  }

  const stylesheetPath = path.join(projectRoot, adapter.layout.globalStylesheet);
  const stylesheet = (await executor.pathExists(stylesheetPath))
    ? await executor.readFile(stylesheetPath)
    : '';
  // An app may already have unrelated reduced-motion rules. Only our scoped
  // marker proves the Motion root fallback was installed.
  if (!stylesheet.includes('[data-motion-root]')) {
    await executor.writeFile(stylesheetPath, `${stylesheet.trimEnd()}\n${reducedMotionCss}`);
  }

  if (options.skipInstall) {
    return;
  }

  const commands = getPackageManagerCommands(options.packageManager);
  const install = commands.add([pinnedSpecifier('motion')]);
  await executor.run(install.command, install.args, { cwd: projectRoot });
}
