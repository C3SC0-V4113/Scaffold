import type { SkillLock } from '../types.js';

export const externalSkillLock: SkillLock = {
  version: 1,
  skills: {
    'architecture-decision-records': {
      source: 'wshobson/agents',
      sourceType: 'github',
      skillPath: 'plugins/documentation-generation/skills/architecture-decision-records/SKILL.md',
      computedHash: '73b129025ba53b5d672474492aa8d8803dde828cb8ac2bd5f2798b98d28a9147',
    },
    'next-best-practices': {
      source: 'vercel-labs/next-skills',
      sourceType: 'github',
      skillPath: 'skills/next-best-practices/SKILL.md',
      computedHash: 'f4678aef4ffc10a5ea64a91e57abe5a5081af813b06d58d565caf3e8ef56e26c',
    },
    'playwright-best-practices': {
      source: 'currents-dev/playwright-best-practices-skill',
      sourceType: 'github',
      skillPath: 'SKILL.md',
      computedHash: '6db654e753257e642d6507d59b4fc633a2382e93429748ba0fb6817c23ef5216',
    },
    'playwright-cli': {
      source: 'microsoft/playwright-cli',
      sourceType: 'github',
      skillPath: 'skills/playwright-cli/SKILL.md',
      computedHash: 'cc5d9f0cc5760217829fbebfa05a23b4ab475ed34005a9ea44e181b8112409f3',
    },
    shadcn: {
      source: 'shadcn/ui',
      sourceType: 'github',
      skillPath: 'skills/shadcn/SKILL.md',
      computedHash: 'eee4f8123d0ce59aa1b2dbf7ea302e6ae1177ff9eb9ec7cb846ccac087e0025e',
    },
    'systematic-debugging': {
      source: 'obra/superpowers',
      sourceType: 'github',
      skillPath: 'skills/systematic-debugging/SKILL.md',
      computedHash: '7246fdd3a795fc3daff0af72044ca99bf836e4e6a46844742858786fdfb86488',
    },
    'typescript-advanced-types': {
      source: 'wshobson/agents',
      sourceType: 'github',
      skillPath: 'plugins/javascript-typescript/skills/typescript-advanced-types/SKILL.md',
      computedHash: 'bc33bc9653d649a461e49abe45634b6b11a7aeeae552b05ec4d54d4589d16739',
    },
    'vercel-composition-patterns': {
      source: 'vercel-labs/agent-skills',
      sourceType: 'github',
      skillPath: 'skills/composition-patterns/SKILL.md',
      computedHash: '575757e3e25761c8c562d6e395d29f0b76c98b1273c0bd72d88e6ab1bc9c7d42',
    },
    'vercel-react-best-practices': {
      source: 'vercel-labs/agent-skills',
      sourceType: 'github',
      skillPath: 'skills/react-best-practices/SKILL.md',
      computedHash: 'ca7b0c0c6e5f2750043f7f0cd72d16ac4e2abc48f9b5500d047a4b77a2506212',
    },
    'verification-before-completion': {
      source: 'obra/superpowers',
      sourceType: 'github',
      skillPath: 'skills/verification-before-completion/SKILL.md',
      computedHash: '9b446f0c7fe1cfb560b1d34439523b1a76d5f177290007b2c053a1c749a4a8ba',
    },
    vitest: {
      source: 'pproenca/dot-skills',
      sourceType: 'github',
      skillPath: 'skills/.curated/vitest/SKILL.md',
      computedHash: '87c43fea89ff2507b4d29b83caf6b3cd8c5f1d756d81ce3f7630a21189aef98b',
    },
  },
};
