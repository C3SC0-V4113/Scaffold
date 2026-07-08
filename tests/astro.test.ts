import { describe, expect, it } from 'vitest';

import { rewriteAstroConfigForAdapter } from '../src/installers/astro.js';

describe('Astro adapter config rewrite', () => {
  it('inserts the adapter without clobbering existing config entries', () => {
    const current = `import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [],
  image: {
    service: 'sharp',
  },
});
`;

    const next = rewriteAstroConfigForAdapter(current, 'cloudflare');

    expect(next).toContain("import { defineConfig } from 'astro/config';");
    expect(next).toContain("import cloudflare from '@astrojs/cloudflare';");
    expect(next).toContain("output: 'server',");
    expect(next).toContain('adapter: cloudflare(),');
    expect(next).toContain('integrations: [],');
    expect(next).toContain("service: 'sharp',");
  });

  it('uses the standalone node adapter block', () => {
    const current = `import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [],
});
`;

    const next = rewriteAstroConfigForAdapter(current, 'node');

    expect(next).toContain("import node from '@astrojs/node';");
    expect(next).toContain("adapter: node({ mode: 'standalone' }),");
    expect(next).toContain('server: {');
    expect(next).toContain('host: true,');
  });
});
