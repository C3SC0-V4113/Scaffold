import path from 'node:path';

import { DryRunExecutor } from '../../executor.js';
import { getPackageManagerCommands } from '../../package-manager.js';
import type { Framework } from '../../types.js';
import { pinnedSpecifier } from '../../installers/config-model.js';
import type { FeatureModule } from '../types.js';
import { queryFeatureFiles, queryPaths, querySourcePatches, patchViteQueryRouter } from './files.js';

const queryDocs = {
  next: {
    readme: `## TanStack Query

The provider lives in \`components/providers/query-provider.tsx\` and wraps the app from \`app/layout.tsx\`. Use stable, domain-first query keys such as \`['todos', { status }]\`; include every value that changes the result. React Query Devtools render only in development. The provider creates its QueryClient with \`useState\` for each server render/request, so cached data is not shared between users.

`,
    agents: `## TanStack Query Rules

- The app-wide provider is \`components/providers/query-provider.tsx\`; it is mounted by \`app/layout.tsx\`.
- Use stable, domain-first query keys and include every variable used by the query function.
- React Query Devtools render only in development.
- The provider creates a QueryClient with \`useState\` per server render/request; never move that client to module scope.

`,
  },
  astro: {
    readme: `## TanStack Query

For each React island that uses queries, wrap its contents in \`QueryProvider\` from \`src/lib/query-provider.tsx\`. Astro islands are separate React roots; the browser singleton in \`src/lib/query-client.ts\` lets those roots share one cache. Use stable, domain-first query keys and include every value that changes the result. React Query Devtools render only in development.

`,
    agents: `## TanStack Query Rules

- Wrap each React island that uses queries in \`QueryProvider\` from \`src/lib/query-provider.tsx\`.
- Astro islands are separate React roots. They share the browser cache through \`src/lib/query-client.ts\`; do not expect React context to cross between islands.
- Use stable, domain-first query keys and include every variable used by the query function.
- React Query Devtools render only in development.

`,
  },
  vite: {
    readme: `## TanStack Query

The provider lives in \`src/lib/query-provider.tsx\` and wraps the app from \`src/main.tsx\`. In data-router mode, the home route shows how to prefill the cache with \`queryClient.ensureQueryData\`. Use stable, domain-first query keys and include every value that changes the result. React Query Devtools render only in development.

`,
    agents: `## TanStack Query Rules

- The provider lives in \`src/lib/query-provider.tsx\` and is mounted from \`src/main.tsx\`.
- In data-router mode, follow the generated home route example for loaders using \`queryClient.ensureQueryData\`.
- Use stable, domain-first query keys and include every variable used by the query function.
- React Query Devtools render only in development.

`,
  },
  'react-router': {
    readme: `## TanStack Query

The provider lives in \`app/lib/query-provider.tsx\` and wraps the route outlet from \`app/root.tsx\`. Use stable, domain-first query keys and include every value that changes the result. React Query Devtools render only in development. The provider creates a QueryClient with \`useState\` for each server request; never use a module-level QueryClient in this server-rendered app.

`,
    agents: `## TanStack Query Rules

- The provider lives in \`app/lib/query-provider.tsx\` and wraps the route outlet in \`app/root.tsx\`.
- Use stable, domain-first query keys and include every variable used by the query function.
- React Query Devtools render only in development.
- Create a QueryClient with \`useState\` per server request; never keep a module-level QueryClient on the server.

`,
  },
} satisfies Record<Framework, { readme: string; agents: string }>;

function insertQueryProvider(sourcePath: string, transform: (source: string) => string) {
  return async (projectRoot: string, executor: Parameters<FeatureModule['install']>[0]['executor']) => {
    const fullPath = path.join(projectRoot, sourcePath);
    if (executor instanceof DryRunExecutor) {
      await executor.writeFile(fullPath);
      return;
    }
    if (!(await executor.pathExists(fullPath))) {
      throw new Error(`Expected scaffold file ${sourcePath} before installing TanStack Query.`);
    }
    await executor.writeFile(fullPath, transform(await executor.readFile(fullPath)));
  };
}

export const queryFeature: FeatureModule = {
  id: 'query',
  enabled: (options) => options.query,
  skills: () => ['tanstack-query'],
  docs: queryDocs,
  files: queryFeatureFiles,
  async install({ adapter, options, executor, projectRoot }) {
    const framework = adapter.id;
    const paths = queryPaths[framework];
    if (paths.integration) {
      await insertQueryProvider(paths.integration, querySourcePatches[framework]!)(projectRoot, executor);
    }
    if (framework === 'vite' && options.router === 'react-router-data') {
      await insertQueryProvider(paths.router!, patchViteQueryRouter)(projectRoot, executor);
    }

    if (options.skipInstall) return;

    const commands = getPackageManagerCommands(options.packageManager);
    const runtime = commands.add([
      pinnedSpecifier('@tanstack/react-query'),
      pinnedSpecifier('@tanstack/react-query-devtools'),
    ]);
    await executor.run(runtime.command, runtime.args, { cwd: projectRoot });
    const eslint = commands.addDev([pinnedSpecifier('@tanstack/eslint-plugin-query')]);
    await executor.run(eslint.command, eslint.args, { cwd: projectRoot });
  },
  lint: () => ({
    files: '**/*.{js,jsx,ts,tsx}',
    imports: ["import queryPlugin from '@tanstack/eslint-plugin-query';"],
    configs: [
      "...queryPlugin.configs['flat/recommended']",
      "reactDoctor.configs['tanstack-query']",
    ],
    rules: {
      'react-doctor/query-no-rest-destructuring': 'off',
      'react-doctor/query-stable-query-client': 'off',
      'react-doctor/query-no-void-query-fn': 'off',
    },
  }),
};
