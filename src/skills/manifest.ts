import type { SkillInstallManifest } from '../types.js';

export const externalSkillManifest: SkillInstallManifest = {
  skills: {
    'architecture-decision-records': {
      source: 'wshobson/agents',
      skill: 'architecture-decision-records',
    },
    'next-best-practices': {
      source: 'vercel-labs/next-skills',
      skill: 'next-best-practices',
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
      source: 'vercel-labs/agent-skills',
      skill: 'composition-patterns',
    },
    'vercel-react-best-practices': {
      source: 'vercel-labs/agent-skills',
      skill: 'react-best-practices',
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
