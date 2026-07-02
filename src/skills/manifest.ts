import type { SkillInstallManifest } from '../types.js';

export const externalSkillManifest: SkillInstallManifest = {
  skills: {
    'architecture-decision-records': {
      source: 'wshobson/agents',
      skill: 'architecture-decision-records',
    },
    'next-cache-components-adoption': {
      source: 'vercel/next.js',
      skill: 'next-cache-components-adoption',
    },
    'next-cache-components-optimizer': {
      source: 'vercel/next.js',
      skill: 'next-cache-components-optimizer',
    },
    'next-dev-loop': {
      source: 'vercel/next.js',
      skill: 'next-dev-loop',
    },
    'playwright-best-practices': {
      source: 'currents-dev/playwright-best-practices-skill',
      skill: 'playwright-best-practices',
    },
    'playwright-cli': {
      source: 'microsoft/playwright-cli',
      skill: 'playwright-cli',
    },
    shadcn: {
      source: 'shadcn/ui',
      skill: 'shadcn',
    },
    'systematic-debugging': {
      source: 'obra/superpowers',
      skill: 'systematic-debugging',
    },
    'typescript-advanced-types': {
      source: 'wshobson/agents',
      skill: 'typescript-advanced-types',
    },
    'vercel-composition-patterns': {
      source: 'https://github.com/vercel-labs/agent-skills',
      skill: 'vercel-composition-patterns',
    },
    'vercel-react-best-practices': {
      source: 'https://github.com/vercel-labs/agent-skills',
      skill: 'vercel-react-best-practices',
    },
    'verification-before-completion': {
      source: 'obra/superpowers',
      skill: 'verification-before-completion',
    },
    vitest: {
      source: 'pproenca/dot-skills',
      skill: 'vitest',
    },
  },
};
