import { describe, expect, it } from 'vitest';

import { renderHomePage } from '../src/templates/files.js';
import {
  getCatRender,
  iconPackages,
  knownIconPackages,
  resolveIconLibrary,
  supportedIconLibraries,
} from '../src/templates/icons.js';

describe('icon library resolution', () => {
  it('honors a forced library', () => {
    expect(resolveIconLibrary('phosphor', 'lucide')).toBe('phosphor');
  });

  it('keeps a supported detected library', () => {
    expect(resolveIconLibrary(undefined, 'tabler')).toBe('tabler');
  });

  it('normalizes unsupported or missing libraries to lucide', () => {
    expect(resolveIconLibrary(undefined, 'hugeicons')).toBe('lucide');
    expect(resolveIconLibrary(undefined, 'radix')).toBe('lucide');
    expect(resolveIconLibrary(undefined, undefined)).toBe('lucide');
  });

  it('maps every supported library to its package and a cat render', () => {
    for (const library of supportedIconLibraries) {
      const render = getCatRender(library);
      expect(render.importLine).toContain(iconPackages[library]);
      expect(render.markup).toMatch(/<(Cat|IconCat)\b/);
      expect(knownIconPackages).toContain(iconPackages[library]);
    }
  });
});

describe('renderHomePage icon wiring', () => {
  it('imports the cat from the selected library', () => {
    expect(renderHomePage('app', 'lucide')).toContain("from 'lucide-react'");
    expect(renderHomePage('app', 'phosphor')).toContain("from '@phosphor-icons/react'");

    const tabler = renderHomePage('app', 'tabler');
    expect(tabler).toContain("from '@tabler/icons-react'");
    expect(tabler).toContain('<IconCat');
  });

  it('uses shadcn tokens and renders an h1, never zinc', () => {
    const page = renderHomePage('app', 'lucide');
    expect(page).toContain('text-muted-foreground');
    expect(page).toContain('text-foreground');
    expect(page).toContain('<h1');
    expect(page).not.toContain('zinc');
  });
});
