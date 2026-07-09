import { describe, expect, it } from 'vitest';

import {
  rewriteAstroConfigForAdapter,
  rewriteAstroTsconfigForShadcn,
} from '../src/installers/astro.js';

describe('Astro tsconfig rewrite', () => {
  it('adds the shadcn alias without clobbering React compiler options', () => {
    const current = JSON.stringify({
      extends: 'astro/tsconfigs/strict',
      compilerOptions: {
        jsx: 'react-jsx',
        jsxImportSource: 'react',
      },
    });

    const next = JSON.parse(rewriteAstroTsconfigForShadcn(current)) as {
      extends: string;
      compilerOptions: {
        jsx: string;
        jsxImportSource: string;
        baseUrl: string;
        paths: Record<string, string[]>;
      };
    };

    expect(next).toEqual({
      extends: 'astro/tsconfigs/strict',
      compilerOptions: {
        jsx: 'react-jsx',
        jsxImportSource: 'react',
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
      },
    });
  });

  it('preserves existing path aliases', () => {
    const current = JSON.stringify({
      compilerOptions: {
        paths: {
          '~/*': ['./src/*'],
        },
      },
    });

    const next = JSON.parse(rewriteAstroTsconfigForShadcn(current)) as {
      compilerOptions: { paths: Record<string, string[]> };
    };

    expect(next.compilerOptions.paths).toEqual({
      '~/*': ['./src/*'],
      '@/*': ['./src/*'],
    });
  });
});

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

  it('fails fast when the Astro config shape is unexpected', () => {
    const current = `export default {};
`;

    expect(() => rewriteAstroConfigForAdapter(current, 'cloudflare')).toThrow(
      'Unexpected astro.config.mjs shape. Expected an Astro config with defineConfig({ ... }).'
    );
  });
});
