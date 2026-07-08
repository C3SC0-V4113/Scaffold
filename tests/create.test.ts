import { afterEach, describe, expect, it, vi } from 'vitest';

const mockConfirm = vi.fn();
const mockSelect = vi.fn();

vi.mock('@inquirer/prompts', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
  select: (...args: unknown[]) => mockSelect(...args),
}));

import { resolveCreateOptions } from '../src/commands/create.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('create option resolution', () => {
  it('prompts for framework before package manager and defaults to Next when yes is used', async () => {
    mockSelect.mockResolvedValueOnce('astro').mockResolvedValueOnce('pnpm');
    mockConfirm.mockResolvedValue(false);

    const options = await resolveCreateOptions('my-app', { yes: false });

    expect(mockSelect).toHaveBeenCalledTimes(2);
    expect(mockSelect.mock.calls[0][0]).toMatchObject({ message: 'Framework', default: 'next' });
    expect(mockSelect.mock.calls[1][0]).toMatchObject({ message: 'Package manager' });
    expect(mockConfirm).toHaveBeenCalled();
    expect(options.framework).toBe('astro');
    expect(options.packageManager).toBe('pnpm');
    expect(options.ssr).toBe(false);
    expect(options.astroAdapter).toBeUndefined();
  });

  it('defaults to Next without prompting when yes is provided', async () => {
    const options = await resolveCreateOptions('my-app', { yes: true });

    expect(options.framework).toBe('next');
    expect(options.ssr).toBe(false);
    expect(options.astroAdapter).toBeUndefined();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('enables Astro SSR and defaults to cloudflare when requested with yes', async () => {
    const options = await resolveCreateOptions('my-app', { framework: 'astro', ssr: true, yes: true });

    expect(options.framework).toBe('astro');
    expect(options.ssr).toBe(true);
    expect(options.astroAdapter).toBe('cloudflare');
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('uses an explicit Astro adapter and implies SSR', async () => {
    const options = await resolveCreateOptions('my-app', {
      framework: 'astro',
      adapter: 'node',
      yes: true,
    });

    expect(options.ssr).toBe(true);
    expect(options.astroAdapter).toBe('node');
  });

  it('rejects unknown frameworks', async () => {
    await expect(
      resolveCreateOptions('my-app', { framework: 'ember', yes: true })
    ).rejects.toThrow('Unsupported framework "ember"');
  });

  it('rejects unsupported Astro adapters', async () => {
    await expect(
      resolveCreateOptions('my-app', { framework: 'astro', adapter: 'deno', yes: true })
    ).rejects.toThrow('Unsupported Astro adapter "deno"');
  });

  it('rejects Astro SSR flags when Next.js is selected', async () => {
    await expect(
      resolveCreateOptions('my-app', { framework: 'next', ssr: true, yes: true })
    ).rejects.toThrow('--ssr and --adapter are only available when --framework astro is selected.');
  });

  it('rejects bun when Astro is selected', async () => {
    await expect(
      resolveCreateOptions('my-app', { framework: 'astro', pm: 'bun', yes: true })
    ).rejects.toThrow('Astro scaffolding is not available with bun yet');
  });
});
