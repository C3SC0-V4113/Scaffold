import type { FrameworkAdapter } from '../frameworks/types.js';
import type { CreateOptions, Executor } from '../types.js';
import { motionFeature } from './motion/index.js';
import type { FeatureFileContext, FeatureModule } from './types.js';

export const featureModules = [motionFeature] satisfies FeatureModule[];

export function enabledFeatureModules(options: CreateOptions) {
  return featureModules.filter((feature) => feature.enabled(options));
}

export async function installEnabledFeatures(context: {
  adapter: FrameworkAdapter;
  options: CreateOptions;
  executor: Executor;
  projectRoot: string;
}) {
  for (const feature of enabledFeatureModules(context.options)) {
    await feature.install(context);
  }
}

export async function writeFeatureFiles(context: FeatureFileContext & { executor: Executor }) {
  for (const feature of enabledFeatureModules(context.options)) {
    for (const file of feature.files?.(context) ?? []) {
      await context.executor.writeFile(file.path, file.content);
    }
  }
}
