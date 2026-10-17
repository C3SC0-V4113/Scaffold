import type { FrameworkAdapter } from '../frameworks/types.js';
import type { CreateOptions, Executor } from '../types.js';
import { motionFeature } from './motion/index.js';
import type { FeatureFileContext, FeatureModule, FeatureOptions } from './types.js';

export const featureModules = [motionFeature] satisfies FeatureModule[];

export function enabledFeatureModules(options: FeatureOptions) {
  return featureModules.filter((feature) => feature.enabled(options));
}

export function featureDocs(framework: CreateOptions['framework'], options: FeatureOptions) {
  return enabledFeatureModules(options).map((feature) => feature.docs[framework]);
}

export function featureLint(options: FeatureOptions, framework: CreateOptions['framework']) {
  return enabledFeatureModules(options)
    .map((feature) => feature.lint?.(options, framework))
    .filter((fragment) => fragment !== undefined);
}

export function featureDoctorIgnoredRules(options: FeatureOptions, adapter: FrameworkAdapter) {
  return enabledFeatureModules(options).flatMap(
    (feature) => feature.doctorIgnoredRules?.(options, adapter) ?? [],
  );
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
