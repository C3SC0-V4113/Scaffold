import { afterEach, describe, expect, it, vi } from 'vitest';

import { installShadcnMcp, shadcnMcpClients } from '../src/installers/shadcn-mcp.js';
import type { CreateOptions, Executor } from '../src/types.js';

afterEach(() => {
  vi.restoreAllMocks();
});

class FlakyExecutor implements Executor {
  readonly runs: string[] = [];

  constructor(private readonly failOn: (rendered: string) => boolean = () => false) {}

  async run(command: string, args: string[]) {
    const rendered = `${command} ${args.join(' ')}`;
    this.runs.push(rendered);
    if (this.failOn(rendered)) {
      throw new Error('ERR_PNPM_NO_MATCHING_VERSION  No matching version found for wrangler@4.127.0');
    }
  }
  async capture() {
    return undefined;
  }
  async ensureDir() {}
  async pathExists() {
    return false;
  }
  async readFile() {
    return '';
  }
  async writeFile() {}
  async writeJson() {}
  async remove() {}
  async symlinkOrJunction() {}
}

const options = { packageManager: 'pnpm', mcp: true } as Pick<
  CreateOptions,
  'packageManager' | 'mcp'
>;

describe('shadcn MCP setup', () => {
  it('wires every client when the CLI cooperates', async () => {
    const executor = new FlakyExecutor();

    await installShadcnMcp('/tmp/my-app', options, executor);

    expect(executor.runs).toHaveLength(shadcnMcpClients.length);
  });

  it('survives a failing client and still attempts the rest', async () => {
    // The generated app works without MCP wiring, but everything that runs
    // after this installer — formatting normalization and the self-check —
    // used to be skipped when one client failed, shipping a project that
    // fails its own `npm run check` (issue #90).
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const executor = new FlakyExecutor((rendered) => rendered.includes('--client claude'));

    await expect(installShadcnMcp('/tmp/my-app', options, executor)).resolves.toBeUndefined();

    expect(executor.runs).toHaveLength(shadcnMcpClients.length);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('claude');
    expect(warn.mock.calls[0][0]).toContain('ERR_PNPM_NO_MATCHING_VERSION');
  });

  it('does nothing when MCP was not requested', async () => {
    const executor = new FlakyExecutor();

    await installShadcnMcp('/tmp/my-app', { ...options, mcp: false }, executor);

    expect(executor.runs).toEqual([]);
  });
});
