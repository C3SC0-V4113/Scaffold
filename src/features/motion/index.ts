import path from 'node:path';

import type { Framework } from '../../types.js';
import type { FeatureModule } from '../types.js';
import { motionMainComponent, renderMotionMainUnitTest } from './files.js';
import { installMotion } from './install.js';

const frameworkFiles = {
  next: {
    motionMainPath: 'components/common/motion-main.tsx',
    lintFile: 'components/common/motion-main.tsx',
  },
  astro: {
    motionMainPath: 'src/components/common/motion-main.tsx',
    lintFile: 'src/components/common/motion-main.tsx',
  },
  vite: {
    motionMainPath: 'src/components/common/motion-main.tsx',
    lintFile: undefined,
  },
  'react-router': {
    motionMainPath: 'app/components/common/motion-main.tsx',
    lintFile: undefined,
  },
} satisfies Record<Framework, { motionMainPath: string; lintFile: string | undefined }>;

const motionDocs = {
  next: {
    readme:
      'In the Next.js App Router, use `motion/react` from a client component or import server-compatible components from `motion/react-client`.',
    agents:
      '- In the Next.js App Router, use `motion/react` in client components or `motion/react-client` for server-compatible components.',
  },
  astro: {
    readme: 'Astro/Vite requires no additional Motion configuration. Use Motion inside React islands.',
    agents: '- Astro/Vite requires no additional Motion configuration; animate within React islands.',
  },
  vite: {
    readme: 'Vite renders React on the client, so Motion components need no server/client boundary.',
    agents: '- Vite renders React on the client; use Motion components without a server/client boundary.',
  },
  'react-router': {
    readme:
      "React Router renders components on the server and hydrates them in the browser. The 'use client' directive has no special effect in this framework mode.",
    agents:
      "- React Router renders Motion components on the server and hydrates them in the browser; 'use client' has no special effect in this framework mode.",
  },
} satisfies Record<Framework, { readme: string; agents: string }>;

const doctorIgnoredRules = {
  next: ['react-doctor/require-reduced-motion'],
  astro: [],
  vite: [],
  'react-router': [],
} satisfies Record<Framework, readonly string[]>;

export const motionFeature: FeatureModule = {
  id: 'motion',
  enabled: (options) => options.motion,
  skills: (options) => (options.motion ? ['motion-framer'] : []),
  docs: motionDocs,
  async install(context) {
    await installMotion(context);
  },
  files({ adapter, options, projectRoot, stage }) {
    if (!options.motion) return [];
    if (stage === 'app-shell') {
      return [{
        path: path.join(projectRoot, frameworkFiles[adapter.id].motionMainPath),
        content: motionMainComponent,
      }];
    }
    if (options.unit) {
      return [{
        path: path.join(projectRoot, 'tests', 'unit', 'motion-main.test.tsx'),
        content: renderMotionMainUnitTest(adapter.layout.importAlias),
      }];
    }
    return [];
  },
  lint(options, adapter) {
    const files = frameworkFiles[adapter.id].lintFile;
    if (!options.motion || !files) return undefined;
    return {
      files,
      rules: { 'react-doctor/jsx-no-new-object-as-prop': 'off' },
    };
  },
  doctorIgnoredRules: (options, adapter) =>
    options.motion ? doctorIgnoredRules[adapter.id] : [],
};
