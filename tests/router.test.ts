import { describe, expect, it, vi } from 'vitest';

import { resolveCreateOptions } from '../src/commands/create.js';
import { frameworkAdapters } from '../src/frameworks/registry.js';
import { validateFrameworkOptions } from '../src/frameworks/validate.js';
import { select } from '@inquirer/prompts';

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
  });
});
