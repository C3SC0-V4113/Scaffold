import type { CreateOptions } from '../types.js';
import type { FeatureModule } from './types.js';

export const featureModules: FeatureModule[] = [];

export function enabledFeatureModules(options: CreateOptions) {
  return featureModules.filter((feature) => feature.enabled(options));
}
