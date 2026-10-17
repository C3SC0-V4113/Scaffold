import type { Framework } from '../types.js';
import { astroAdapter } from './astro/index.js';
import { nextAdapter } from './next/index.js';
import { viteAdapter } from './vite/index.js';
import { reactRouterAdapter } from './react-router/index.js';
import type { FrameworkAdapter } from './types.js';

export const frameworkAdapters = {
  next: nextAdapter,
  astro: astroAdapter,
  vite: viteAdapter,
  'react-router': reactRouterAdapter,
} satisfies Record<Framework, FrameworkAdapter>;
export const getFrameworkAdapter = (id: Framework) => frameworkAdapters[id];
export const frameworkRegistry = Object.values(frameworkAdapters);

export function isFramework(value: string): value is Framework {
  return value in frameworkAdapters;
}

export const defaultFramework: Framework = 'next';
