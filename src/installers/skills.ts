import path from 'node:path';

import { externalSkillManifest } from '../skills/manifest.js';
import {
  renderDecisionDocSyncSkill,
  renderProjectArchitectureSkill,
  renderProjectMinEvaluationSkill,
  renderReactDoctorSkill,
} from '../templates/skills.js';
import type { CreateOptions, Executor, SkillInstallEntry } from '../types.js';

const alwaysExternalSkills = [
  'architecture-decision-records',
  'next-best-practices',
  'shadcn',
  'systematic-debugging',
  'typescript-advanced-types',
  'vercel-composition-patterns',
  'vercel-react-best-practices',
  'verification-before-completion',
] as const;

const localSkillRenderers = {
  'project-architecture': renderProjectArchitectureSkill,
  'project-min-evaluation': renderProjectMinEvaluationSkill,
  'decision-doc-sync': renderDecisionDocSyncSkill,
  'react-doctor': renderReactDoctorSkill,
} as const;

export function selectSkillNames(options: Pick<CreateOptions, 'unit' | 'e2e'>) {
  return [
    ...alwaysExternalSkills,
    'project-architecture',
    'project-min-evaluation',
    'decision-doc-sync',
    'react-doctor',
    ...(options.unit ? ['vitest'] : []),
    ...(options.e2e ? ['playwright-best-practices', 'playwright-cli'] : []),
  ];
}

async function installLocalSkills(
  projectRoot: string,
  options: CreateOptions,
  executor: Executor
) {
  await executor.writeFile(
    path.join(projectRoot, '.agents', 'skills', 'project-architecture', 'SKILL.md'),
    localSkillRenderers['project-architecture']()
  );
  await executor.writeFile(
    path.join(projectRoot, '.agents', 'skills', 'project-min-evaluation', 'SKILL.md'),
    localSkillRenderers['project-min-evaluation'](options)
  );
  await executor.writeFile(
    path.join(projectRoot, '.agents', 'skills', 'decision-doc-sync', 'SKILL.md'),
    localSkillRenderers['decision-doc-sync']()
  );
  await executor.writeFile(
    path.join(projectRoot, '.agents', 'skills', 'react-doctor', 'SKILL.md'),
    localSkillRenderers['react-doctor'](options)
  );
}

interface SkillInstallCommand {
  command: string;
  args: string[];
}

function selectExternalSkillEntries(options: Pick<CreateOptions, 'unit' | 'e2e'>) {
  return selectSkillNames(options)
    .map((skillName) => externalSkillManifest.skills[skillName])
    .filter((entry): entry is SkillInstallEntry => Boolean(entry));
}

export function buildSkillInstallCommands(
  options: Pick<CreateOptions, 'unit' | 'e2e'>
): SkillInstallCommand[] {
  const skillsBySource = new Map<string, string[]>();

  for (const entry of selectExternalSkillEntries(options)) {
    skillsBySource.set(entry.source, [...(skillsBySource.get(entry.source) ?? []), entry.skill]);
  }

  return [...skillsBySource.entries()].map(([source, skills]) => ({
    command: 'npx',
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

export function renderSkillsScript(options: Pick<CreateOptions, 'unit' | 'e2e'>) {
  const commands = buildSkillInstallCommands(options).map(({ command, args }) =>
    [command, ...args].join(' ')
  );

  return `#!/usr/bin/env bash
set -euo pipefail

${commands.join('\n')}
`;
}

export async function installSkills(projectRoot: string, options: CreateOptions, executor: Executor) {
  await installLocalSkills(projectRoot, options, executor);
  await executor.writeFile(path.join(projectRoot, 'skills.sh'), renderSkillsScript(options));

  for (const { command, args } of buildSkillInstallCommands(options)) {
    await executor.run(command, args, { cwd: projectRoot });
  }
}
