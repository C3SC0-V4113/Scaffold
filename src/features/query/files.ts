import path from 'node:path';

import type { Framework, RouterChoice } from '../../types.js';
import type { FeatureFileContext } from '../types.js';

export const queryPaths: Record<Framework, {
  provider: string;
  client?: string;
  integration?: string;
  router?: string;
}> = {
  next: {
    provider: 'components/providers/query-provider.tsx',
    integration: 'app/layout.tsx',
  },
  astro: {
    provider: 'src/lib/query-provider.tsx',
    client: 'src/lib/query-client.ts',
  },
  vite: {
    provider: 'src/lib/query-provider.tsx',
    client: 'src/query-client.ts',
    integration: 'src/main.tsx',
    router: 'src/router.tsx',
  },
  'react-router': {
    provider: 'app/lib/query-provider.tsx',
    integration: 'app/root.tsx',
  },
};

function renderRequestScopedProvider() {
  return `'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
`;
}

const astroQueryClient = `import { QueryClient } from '@tanstack/react-query';

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return new QueryClient();
  }

  browserQueryClient ??= new QueryClient();
  return browserQueryClient;
}
`;

const astroQueryProvider = `'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

import { getQueryClient } from './query-client';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
`;

const viteQueryClient = `import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();
`;

const viteQueryProvider = `'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

import { queryClient as sharedQueryClient } from '../query-client';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => sharedQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
`;

const viteHomeQuery = `export const homeQueryOptions = {
  queryKey: ['home'] as const,
  queryFn: async () => 'This home data is cached by TanStack Query.',
};
`;

function renderUnitTest(importPath: string) {
  return `import { render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { QueryProvider } from '${importPath}';

function QueryClientProbe() {
  const queryClient = useQueryClient();
  return <span>{queryClient.getQueryCache().getAll().length}</span>;
}

describe('QueryProvider', () => {
  it('provides a query client to child components', () => {
    render(
      <QueryProvider>
        <QueryClientProbe />
      </QueryProvider>,
    );

    expect(screen.getByText('0')).toBeTruthy();
  });
});
`;
}

export function queryFeatureFiles({ adapter, options, projectRoot, stage }: FeatureFileContext) {
  const framework = adapter.id;
  const files: Array<{ path: string; content: string }> = [];

  if (stage === 'unit-tests') {
    if (!options.unit) return files;
    const importPaths: Record<Framework, string> = {
      next: '@/components/providers/query-provider',
      astro: '@/lib/query-provider',
      vite: '@/lib/query-provider',
      'react-router': '~/lib/query-provider',
    };
    return [{
      path: path.join(projectRoot, 'tests', 'unit', 'query-provider.test.tsx'),
      content: renderUnitTest(importPaths[framework]),
    }];
  }

  const target = queryPaths[framework];
  if (framework === 'next' || framework === 'react-router') {
    files.push({ path: path.join(projectRoot, target.provider), content: renderRequestScopedProvider() });
  } else if (framework === 'astro') {
    files.push(
      { path: path.join(projectRoot, target.client!), content: astroQueryClient },
      { path: path.join(projectRoot, target.provider), content: astroQueryProvider },
    );
  } else {
    files.push(
      { path: path.join(projectRoot, target.client!), content: viteQueryClient },
      { path: path.join(projectRoot, target.provider), content: viteQueryProvider },
    );
    if ((options.router as RouterChoice) === 'react-router-data') {
      files.push({
        path: path.join(projectRoot, 'src/queries/home.ts'),
        content: viteHomeQuery,
      });
    }
  }

  return files;
}

function addImport(source: string, importLine: string) {
  if (source.includes(importLine)) return source;
  return `${importLine}\n${source}`;
}

function patchNextLayout(source: string) {
  let result = addImport(source, "import { QueryProvider } from '@/components/providers/query-provider';");
  const wrapped = result.replace(/(<body\b[^>]*>)([\s\S]*?)(<\/body>)/, '$1\n        <QueryProvider>$2\n        </QueryProvider>\n      $3');
  if (wrapped === result) {
    throw new Error('Could not find the body element in app/layout.tsx to install QueryProvider.');
  }
  result = wrapped;
  return result;
}

function patchViteMain(source: string) {
  let result = addImport(source, "import { QueryProvider } from './lib/query-provider';");
  const wrapped = result.replace(
    /(<StrictMode>\s*)([\s\S]*?)(\s*<\/StrictMode>)/,
    (_match, opening: string, children: string, closing: string) =>
      `${opening}<QueryProvider>\n      ${children.trim()}\n      </QueryProvider>${closing}`,
  );
  if (wrapped === result) {
    throw new Error('Could not find the StrictMode root in src/main.tsx to install QueryProvider.');
  }
  return wrapped;
}

function patchReactRouterRoot(source: string) {
  let result = addImport(source, "import { QueryProvider } from '~/lib/query-provider';");
  const wrapped = result.replace(/<Outlet\s*\/>/, '<QueryProvider><Outlet /></QueryProvider>');
  if (wrapped === result) {
    throw new Error('Could not find the root Outlet in app/root.tsx to install QueryProvider.');
  }
  return wrapped;
}

function patchViteDataRouter(source: string) {
  let result = addImport(source, "import { homeQueryOptions } from './queries/home';\nimport { queryClient } from './query-client';");
  const wrapped = result.replace(
    '{ index: true, element: <App /> },',
    '{ index: true, element: <App />, loader: () => queryClient.ensureQueryData(homeQueryOptions) },',
  );
  if (wrapped === result) {
    throw new Error('Could not find the Vite data router home route in src/router.tsx.');
  }
  return wrapped;
}

export const querySourcePatches = {
  next: patchNextLayout,
  astro: undefined,
  vite: patchViteMain,
  'react-router': patchReactRouterRoot,
} satisfies Record<Framework, ((source: string) => string) | undefined>;

export function patchViteQueryRouter(source: string) {
  return patchViteDataRouter(source);
}
