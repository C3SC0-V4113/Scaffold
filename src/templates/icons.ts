import type { IconLibrary } from '../types.js';

export interface IconRender {
  /** Import statement for the cat icon. */
  importLine: string;
  /** JSX markup for the cat, styled with shadcn tokens. */
  markup: string;
}

/** npm package purrfold installs/uses for each supported icon library. */
export const iconPackages: Record<IconLibrary, string> = {
  lucide: 'lucide-react',
  phosphor: '@phosphor-icons/react',
  tabler: '@tabler/icons-react',
};

export const supportedIconLibraries = Object.keys(iconPackages) as IconLibrary[];

/**
 * Every icon package shadcn might install for its built-in icon libraries.
 * Used to reconcile: keep the effective library's package and remove the rest
 * so nothing is left as an unused dependency.
 */
export const knownIconPackages = [
  'lucide-react',
  '@phosphor-icons/react',
  '@tabler/icons-react',
  '@radix-ui/react-icons',
  '@hugeicons/react',
  '@hugeicons/core-free-icons',
  '@remixicon/react',
];

export function isSupportedIconLibrary(value: string | undefined): value is IconLibrary {
  return typeof value === 'string' && (supportedIconLibraries as string[]).includes(value);
}

/** Resolve the effective (always supported) icon library. */
export function resolveIconLibrary(forced: IconLibrary | undefined, detected: string | undefined): IconLibrary {
  if (forced) {
    return forced;
  }
  if (isSupportedIconLibrary(detected)) {
    return detected;
  }
  return 'lucide';
}

const ICON_CLASS = 'size-10 text-muted-foreground';

const renderers: Record<IconLibrary, IconRender> = {
  lucide: {
    importLine: "import { Cat } from 'lucide-react';",
    markup: `<Cat className="${ICON_CLASS}" aria-hidden />`,
  },
  phosphor: {
    importLine: "import { Cat } from '@phosphor-icons/react';",
    markup: `<Cat className="${ICON_CLASS}" aria-hidden />`,
  },
  tabler: {
    importLine: "import { IconCat } from '@tabler/icons-react';",
    markup: `<IconCat className="${ICON_CLASS}" aria-hidden />`,
  },
};

export function getCatRender(library: IconLibrary): IconRender {
  return renderers[library];
}
