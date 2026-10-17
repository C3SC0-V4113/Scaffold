import path from 'node:path';

import type { Framework } from '../../types.js';
import type { FeatureModule } from '../types.js';
import { motionMainComponent, renderMotionMainUnitTest } from './files.js';
import { installMotion } from './install.js';

export const motionFilePaths = {
  next: 'components/common/motion-main.tsx',
  astro: 'src/components/common/motion-main.tsx',
  vite: 'src/components/common/motion-main.tsx',
  'react-router': 'app/components/common/motion-main.tsx',
} satisfies Record<Framework, string>;

const frameworkFiles = {
  next: {
    motionMainPath: motionFilePaths.next,
    lintFile: 'components/common/motion-main.tsx',
  },
  astro: {
    motionMainPath: motionFilePaths.astro,
    lintFile: 'src/components/common/motion-main.tsx',
  },
  vite: {
    motionMainPath: motionFilePaths.vite,
    lintFile: undefined,
  },
  'react-router': {
    motionMainPath: motionFilePaths['react-router'],
    lintFile: undefined,
  },
} satisfies Record<Framework, { motionMainPath: string; lintFile: string | undefined }>;

const motionDocs = {
  next: {
    readme: `## Motion

Import React APIs from \`motion/react\`. In the Next.js App Router, use \`motion/react\` from a client component or import server-compatible components from \`motion/react-client\`.

- Use animation only when it clarifies state or spatial relationships.
- Prefer \`transform\` and \`opacity\` for smooth rendering.
- Respect \`prefers-reduced-motion\`; Motion's \`useReducedMotion\` can adapt non-essential movement.
- Agent guidance: \`.agents/skills/motion-framer/SKILL.md\`.
- If that external skill recommends \`framer-motion\`, this project's \`motion\` dependency and the current official Motion documentation take precedence.

`,
    agents: `## Motion Rules

- In the Next.js App Router, use \`motion/react\` in client components or \`motion/react-client\` for server-compatible components.
- Import current React APIs from \`motion/react\`.
- Animate purposefully, prefer \`transform\` and \`opacity\`, and respect \`prefers-reduced-motion\`.
- Read \`.agents/skills/motion-framer/SKILL.md\` for animation guidance.
- If the external skill recommends \`framer-motion\`, the installed \`motion\` dependency and current official Motion documentation take precedence.

`,
  },
  astro: {
    readme: `## Motion

Import React APIs from \`motion/react\`. Astro/Vite requires no additional Motion configuration. Use Motion inside React islands.

- Use animation only when it clarifies state or spatial relationships.
- Prefer \`transform\` and \`opacity\` for smooth rendering.
- Respect \`prefers-reduced-motion\`; Motion's \`useReducedMotion\` can adapt non-essential movement.
- Agent guidance: \`.agents/skills/motion-framer/SKILL.md\`.
- If that external skill recommends \`framer-motion\`, this project's \`motion\` dependency and the current official Motion documentation take precedence.

`,
    agents: `## Motion Rules

- Astro/Vite requires no additional Motion configuration; animate within React islands.
- Import current React APIs from \`motion/react\`.
- Animate purposefully, prefer \`transform\` and \`opacity\`, and respect \`prefers-reduced-motion\`.
- Read \`.agents/skills/motion-framer/SKILL.md\` for animation guidance.
- If the external skill recommends \`framer-motion\`, the installed \`motion\` dependency and current official Motion documentation take precedence.

`,
  },
  vite: {
    readme: `## Motion

Import React APIs from \`motion/react\`. Vite renders React on the client, so Motion components need no server/client boundary.

- Use animation only when it clarifies state or spatial relationships.
- Prefer \`transform\` and \`opacity\` for smooth rendering.
- Respect \`prefers-reduced-motion\`; Motion's \`useReducedMotion\` can adapt non-essential movement.
- Agent guidance: \`.agents/skills/motion-framer/SKILL.md\`.
- If that external skill recommends \`framer-motion\`, this project's \`motion\` dependency and the current official Motion documentation take precedence.

`,
    agents: `## Motion Rules

- Vite renders React on the client; use Motion components without a server/client boundary.
- Import current React APIs from \`motion/react\`.
- Animate purposefully, prefer \`transform\` and \`opacity\`, and respect \`prefers-reduced-motion\`.
- Read \`.agents/skills/motion-framer/SKILL.md\` for animation guidance.
- If the external skill recommends \`framer-motion\`, the installed \`motion\` dependency and current official Motion documentation take precedence.

`,
  },
  'react-router': {
    readme: `## Motion

Import React APIs from \`motion/react\`. React Router renders components on the server and hydrates them in the browser. The 'use client' directive has no special effect in this framework mode.

- Use animation only when it clarifies state or spatial relationships.
- Prefer \`transform\` and \`opacity\` for smooth rendering.
- Respect \`prefers-reduced-motion\`; Motion's \`useReducedMotion\` can adapt non-essential movement.
- Agent guidance: \`.agents/skills/motion-framer/SKILL.md\`.
- If that external skill recommends \`framer-motion\`, this project's \`motion\` dependency and the current official Motion documentation take precedence.

`,
    agents: `## Motion Rules

- React Router renders Motion components on the server and hydrates them in the browser; 'use client' has no special effect in this framework mode.
- Import current React APIs from \`motion/react\`.
- Animate purposefully, prefer \`transform\` and \`opacity\`, and respect \`prefers-reduced-motion\`.
- Read \`.agents/skills/motion-framer/SKILL.md\` for animation guidance.
- If the external skill recommends \`framer-motion\`, the installed \`motion\` dependency and current official Motion documentation take precedence.

`,
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
  skills: () => ['motion-framer'],
  docs: motionDocs,
  async install(context) {
    await installMotion(context);
  },
  files({ adapter, options, projectRoot, stage }) {
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
  lint(options, framework) {
    const files = frameworkFiles[framework].lintFile;
    if (!files) return undefined;
    return {
      files,
      rules: { 'react-doctor/jsx-no-new-object-as-prop': 'off' },
    };
  },
  doctorIgnoredRules: (_options, framework) => doctorIgnoredRules[framework],
};
