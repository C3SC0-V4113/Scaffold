import { createHash } from 'node:crypto';
import path from 'node:path';
import posixPath from 'node:path/posix';

import { externalSkillLock } from '../skills/manifest.js';
import {
  renderDecisionDocSyncSkill,
  renderProjectArchitectureSkill,
  renderProjectMinEvaluationSkill,
  renderReactDoctorSkill,
} from '../templates/skills.js';
import type { CreateOptions, Executor, SkillLock, SkillManifestEntry } from '../types.js';

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

function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

interface GitHubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
}

interface DownloadedSkillFile {
  relativePath: string;
  content: string;
}

function githubContentsUrl(source: string, directoryPath: string) {
  const suffix = directoryPath ? `/${directoryPath}` : '';
  return `https://api.github.com/repos/${source}/contents${suffix}?ref=HEAD`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchGithubDirectory(
  source: string,
  directoryPath: string,
  baseDirectoryPath: string
): Promise<DownloadedSkillFile[]> {
  const items = await fetchJson<GitHubContentItem[]>(githubContentsUrl(source, directoryPath));
  const files = await Promise.all(
    items.map(async (item) => {
      if (item.type === 'dir') {
        return fetchGithubDirectory(source, item.path, baseDirectoryPath);
      }

      if (!item.download_url) {
        throw new Error(`GitHub file ${item.path} does not expose a download_url.`);
      }

      return [
        {
          relativePath: posixPath.relative(baseDirectoryPath, item.path),
          content: await fetchText(item.download_url),
        },
      ];
    })
  );

  return files.flat();
}

async function fetchExternalSkill(skillName: string, entry: SkillManifestEntry) {
  const skillDirectory = posixPath.dirname(entry.skillPath);
  const baseDirectoryPath = skillDirectory === '.' ? '' : skillDirectory;
  const files = await fetchGithubDirectory(entry.source, baseDirectoryPath, baseDirectoryPath);
  const skillFile = files.find((file) => file.relativePath === posixPath.basename(entry.skillPath));

  if (!skillFile) {
    throw new Error(`Downloaded skill ${skillName} did not include ${entry.skillPath}.`);
  }

  if (entry.computedHash && sha256(skillFile.content) !== entry.computedHash) {
    throw new Error(`Hash mismatch for skill ${skillName}. Refusing to install downloaded content.`);
  }

  return files;
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

export async function installSkills(projectRoot: string, options: CreateOptions, executor: Executor) {
  const selectedNames = selectSkillNames(options);
  const selectedExternalEntries: SkillLock['skills'] = {};

  await installLocalSkills(projectRoot, options, executor);

  for (const skillName of selectedNames) {
    const entry = externalSkillLock.skills[skillName];
    if (!entry) {
      continue;
    }

    selectedExternalEntries[skillName] = entry;
    const destination = path.join(projectRoot, '.agents', 'skills', skillName, 'SKILL.md');

    if (options.dryRun) {
      await executor.writeFile(destination, `# ${skillName}\n`);
      continue;
    }

    const files = await fetchExternalSkill(skillName, entry);
    await Promise.all(
      files.map((file) =>
        executor.writeFile(
          path.join(projectRoot, '.agents', 'skills', skillName, ...file.relativePath.split('/')),
          file.content
        )
      )
    );
  }

  await executor.writeJson(path.join(projectRoot, 'skills-lock.json'), {
    version: 1,
    skills: selectedExternalEntries,
  } satisfies SkillLock);
}
