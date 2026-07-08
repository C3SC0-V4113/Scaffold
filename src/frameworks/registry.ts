import type { Framework } from '../types.js';

export interface FrameworkDefinition {
  value: Framework;
  label: string;
  description: string;
}

export const frameworkRegistry: FrameworkDefinition[] = [
  {
    value: 'next',
    label: 'Next.js',
    description: 'Default framework with the current purrfold workflow.',
  },
  {
    value: 'astro',
    label: 'Astro',
    description: 'React-enabled Astro scaffold for shadcn-compatible projects.',
  },
];

export function isFramework(value: string): value is Framework {
  return frameworkRegistry.some((framework) => framework.value === value);
}

export const defaultFramework: Framework = 'next';
