import path from 'node:path';

import { externalSkillManifest } from '../skills/manifest.js';
import type { CreateOptions, Executor, SkillInstallEntry } from '../types.js';

const frameworkAgnosticExternalSkills = [
  'architecture-decision-records',
  'shadcn',
  'systematic-debugging',
  'typescript-advanced-types',
  'verification-before-completion',
] as const;

const reactExternalSkills = [
  'vercel-composition-patterns',
  'vercel-react-best-practices',
] as const;

const frameworkSpecificExternalSkills = {
  next: ['next-cache-components-adoption', 'next-cache-components-optimizer', 'next-dev-loop'],
  astro: ['astro'],
} as const;

type SkillSelectionOptions = Pick<CreateOptions, 'framework' | 'unit' | 'e2e' | 'motion'>;

export function selectSkillNames(options: SkillSelectionOptions) {
  return [
    ...frameworkAgnosticExternalSkills,
    ...reactExternalSkills,
    ...frameworkSpecificExternalSkills[options.framework],
    'project-architecture',
    'shadcn-component-boundaries',
    'project-min-evaluation',
    'decision-doc-sync',
    'react-doctor',
    ...(options.unit ? ['vitest'] : []),
    ...(options.e2e ? ['playwright-best-practices', 'playwright-cli'] : []),
    ...(options.motion ? ['motion-framer'] : []),
  ];
}

interface SkillInstallCommand {
  command: string;
  args: string[];
  /** The skills this one command fetches, so a failure can name them. */
  skills: string[];
}

function selectExternalSkillEntries(options: SkillSelectionOptions) {
  return selectSkillNames(options)
    .map((skillName) => externalSkillManifest.skills[skillName])
    .filter((entry): entry is SkillInstallEntry => Boolean(entry));
}

export function buildSkillInstallCommands(
  options: SkillSelectionOptions
): SkillInstallCommand[] {
  const skillsBySource = new Map<string, string[]>();

  for (const entry of selectExternalSkillEntries(options)) {
    skillsBySource.set(entry.source, [...(skillsBySource.get(entry.source) ?? []), entry.skill]);
  }

  return [...skillsBySource.entries()].map(([source, skills]) => ({
    command: 'npx',
    skills,
    args: [
      '--yes',
      'skills@latest',
      'add',
      source,
      ...skills.flatMap((skill) => ['--skill', skill]),
      '--agent',
      'codex',
      '--copy',
      '--yes',
    ],
  }));
}

export function renderSkillsScript(options: SkillSelectionOptions) {
  const commands = buildSkillInstallCommands(options).map(({ command, args }) =>
    [command, ...args].join(' ')
  );

  return `#!/usr/bin/env bash
set -euo pipefail

${commands.join('\n')}
`;
}

export async function installSkills(projectRoot: string, options: CreateOptions, executor: Executor) {
  const skillsDir = path.join(projectRoot, '.agents', 'skills');

  // Every skill is downloaded, and a download may fail, so nothing else is
  // guaranteed to create this directory. The Windows junction fallback needs
  // its target to exist, so create it before linking .claude/skills to it.
  await executor.ensureDir(skillsDir);
  await executor.symlinkOrJunction(skillsDir, path.join(projectRoot, '.claude', 'skills'));
  await executor.writeFile(path.join(projectRoot, 'skills.sh'), renderSkillsScript(options));

  const failures: string[] = [];

  for (const { command, args, skills } of buildSkillInstallCommands(options)) {
    try {
      await executor.run(command, args, { cwd: projectRoot });
    } catch (error) {
      failures.push(...skills);
      console.warn(
        `Skipping external skill install after failure: ${command} ${args.join(' ')}\n` +
          `You can retry it from the generated skills.sh file.`
      );
      console.warn(error);
    }
  }

  // The per-failure warnings above scroll away behind installer output, so a
  // generation that fetched nothing looks identical to one that fetched
  // everything. Continuing is right — an unreachable third-party repository
  // should not fail a scaffold — but doing it invisibly is not.
  if (failures.length > 0) {
    console.warn(
      `\n⚠ ${failures.length} external skill${failures.length === 1 ? '' : 's'} could not be installed:\n` +
        failures.map((skill) => `    - ${skill}`).join('\n') +
        `\n  The project is otherwise complete. Retry them with: sh skills.sh\n`
    );
  }
}
