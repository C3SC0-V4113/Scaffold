import type { Framework } from '../types.js';
import { astroAdapter } from './astro/index.js';
import { nextAdapter } from './next/index.js';
import type { FrameworkAdapter } from './types.js';

export const frameworkAdapters = {
  next: nextAdapter,
  astro: astroAdapter,
} satisfies Record<Framework, FrameworkAdapter>;
export const getFrameworkAdapter = (id: Framework) => frameworkAdapters[id];
export const frameworkRegistry = Object.values(frameworkAdapters);

export function isFramework(value: string): value is Framework {
  return value in frameworkAdapters;
}

export const defaultFramework: Framework = 'next';
