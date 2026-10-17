import { describe, expect, it, vi } from 'vitest';
import { select } from '@inquirer/prompts';

import { resolveCreateOptions } from '../src/commands/create.js';
import { frameworkAdapters } from '../src/frameworks/registry.js';
import { validateFrameworkOptions } from '../src/frameworks/validate.js';
import { selectSkillNames } from '../src/installers/skills.js';
import { renderViteEslintConfig } from '../src/templates/eslint.js';
import { renderViteHomePage } from '../src/templates/files.js';
import {
  renderViteRouterE2ESmokeTest,
  renderViteRouterFiles,
  renderViteRouterUnitSmokeTest,
} from '../src/templates/vite-router.js';

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(false),
  select: vi.fn().mockResolvedValue('react-router-declarative'),
}));

describe('router selection', () => {
  it('defaults Vite to data mode in non-interactive runs', async () => {
    await expect(
      resolveCreateOptions('app', { framework: 'vite', pm: 'npm', yes: true }),
    ).resolves.toMatchObject({ router: 'react-router-data' });
  });

  it('accepts explicit router modes, including none on frameworks that own routing', async () => {
    await expect(
      resolveCreateOptions('app', { framework: 'vite', pm: 'npm', router: 'react-router-declarative', yes: true }),
    ).resolves.toMatchObject({ router: 'react-router-declarative' });
    await expect(
      resolveCreateOptions('app', { framework: 'vite', pm: 'npm', router: 'none', yes: true }),
    ).resolves.toMatchObject({ router: 'none' });
    await expect(
      resolveCreateOptions('app', { framework: 'next', pm: 'npm', router: 'none', yes: true }),
    ).resolves.toMatchObject({ router: 'none' });
    await expect(
      resolveCreateOptions('app', { framework: 'astro', pm: 'npm', router: 'none', yes: true }),
    ).resolves.toMatchObject({ router: 'none' });
  });

  it('prompts with the Vite capability choices and default', async () => {
    await resolveCreateOptions('app', { framework: 'vite', pm: 'npm' });

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Router',
        default: 'react-router-data',
        choices: [
          { name: 'No router', value: 'none' },
          { name: 'React Router (data mode)', value: 'react-router-data' },
          { name: 'React Router (declarative mode)', value: 'react-router-declarative' },
        ],
      }),
    );
  });

  it('reports unknown choices and framework capability failures precisely', async () => {
    await expect(
      resolveCreateOptions('app', { framework: 'vite', pm: 'npm', router: 'bogus', yes: true }),
    ).rejects.toThrow('Unsupported router "bogus". Use none, react-router-data, or react-router-declarative.');
    await expect(
      resolveCreateOptions('app', { framework: 'next', pm: 'npm', router: 'react-router-data', yes: true }),
    ).rejects.toThrow('--router is only available when --framework vite is selected.');
    expect(() =>
      validateFrameworkOptions(frameworkAdapters.next, 'npm', { router: 'react-router-data' }),
    ).toThrow('--router is only available when --framework vite is selected.');

    const partialAstro = {
      ...frameworkAdapters.astro,
      capabilities: {
        ...frameworkAdapters.astro.capabilities,
        routers: ['none', 'react-router-data'] as const,
      },
    };
    expect(() =>
      validateFrameworkOptions(partialAstro, 'npm', { router: 'react-router-declarative' }),
    ).toThrow('--router is only available when --framework vite is selected.');
    expect(() =>
      validateFrameworkOptions(partialAstro, 'npm', { router: 'react-router-data' }),
    ).not.toThrow();
    expect(() => validateFrameworkOptions(frameworkAdapters.next, 'npm', { router: 'none' })).not.toThrow();
    expect(() => validateFrameworkOptions(frameworkAdapters.astro, 'npm', { router: 'none' })).not.toThrow();
  });

  it('scaffolds the selected Vite routes and keeps none empty', () => {
    expect(renderViteRouterFiles('none', 'app', 'lucide', false)).toEqual({
      'src/App.tsx': renderViteHomePage('app', 'lucide', false),
    });
    const data = renderViteRouterFiles('react-router-data', 'app', 'lucide', true);
    expect(data).toMatchSnapshot('data router files');
    expect(data['src/router.tsx']).toContain('createBrowserRouter');
    expect(data['src/RouterLayout.tsx']).toContain('<Outlet />');
    expect(data['src/router.tsx']).toContain('errorElement: <ErrorBoundary />');
    expect(data['src/router.tsx']).toContain("{ path: '*', element: <NotFound /> }");
    expect(data['src/main.tsx']).toContain('<RouterProvider router={router} />');
    expect(data['src/App.tsx']).toContain('MotionMain');
    expect(renderViteRouterUnitSmokeTest('react-router-data')).toContain('createMemoryRouter');
    expect(renderViteRouterE2ESmokeTest('react-router-data')).toContain("page.goto('/missing-route')");

    const declarative = renderViteRouterFiles('react-router-declarative', 'app', 'lucide', false);
    expect(declarative).toMatchSnapshot('declarative router files');
    expect(declarative['src/main.tsx']).toContain('<BrowserRouter>');
    expect(declarative['src/App.tsx']).toContain('<Routes>');
    expect(declarative['src/App.tsx']).toContain('export function HomePage()');
    expect(declarative['src/App.tsx']).toContain('<Route path="*"');
    expect(renderViteRouterUnitSmokeTest('react-router-declarative')).toContain('<MemoryRouter');
    expect(renderViteRouterE2ESmokeTest('react-router-declarative')).toContain("page.goto('/missing-route')");
    expect(renderViteRouterE2ESmokeTest('none')).toBeUndefined();
  });

  it('selects the router skill and lint rules only for router modes', () => {
    expect(selectSkillNames({ framework: 'vite', router: 'react-router-data', unit: false, e2e: false, motion: false, query: false }))
      .toContain('react-router');
    expect(selectSkillNames({ framework: 'vite', router: 'react-router-declarative', unit: false, e2e: false, motion: false, query: false }))
      .toContain('react-router');
    expect(selectSkillNames({ framework: 'vite', router: 'none', unit: false, e2e: false, motion: false, query: false }))
      .not.toContain('react-router');
    expect(renderViteEslintConfig({
      framework: 'vite', router: 'none', unit: false, e2e: false, query: false,
    })).not.toContain('reactDoctor.configs.all.rules');
    expect(renderViteEslintConfig({
      framework: 'vite', router: 'react-router-data', unit: false, e2e: false, query: false,
    })).toContain('reactDoctor.configs.all.rules');
  });
});
