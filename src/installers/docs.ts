import path from 'node:path';

import {
  claudeReactDoctorHook,
  claudeSettings,
  renderClaudeProjectMinEvaluationHook,
} from '../templates/hooks.js';
import { designDoc, renderAgents, renderReadme } from '../templates/files.js';
import type { CreateOptions, Executor } from '../types.js';

export const PURRFOLD_MANAGED_BEGIN = '<!-- BEGIN:purrfold-managed -->';
export const PURRFOLD_MANAGED_END = '<!-- END:purrfold-managed -->';

function markerCount(content: string, marker: string) {
  return content.split(marker).length - 1;
}

function lineEndingFor(content: string) {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

function normalizeLineEndings(content: string, lineEnding: string) {
  return content.replace(/\r?\n/g, lineEnding);
}

export function mergePurrfoldMarkdown(existing: string, managedContent: string) {
  const beginCount = markerCount(existing, PURRFOLD_MANAGED_BEGIN);
  const endCount = markerCount(existing, PURRFOLD_MANAGED_END);
  const managedBlockPattern =
    /<!-- BEGIN:purrfold-managed -->[\s\S]*?<!-- END:purrfold-managed -->/g;
  const matches = existing.match(managedBlockPattern) ?? [];

  if (beginCount !== endCount || matches.length !== beginCount) {
    throw new Error(
      'Cannot update Purrfold documentation because its managed block markers are incomplete or out of order. Restore matching BEGIN:purrfold-managed and END:purrfold-managed markers, then run purrfold again.'
    );
  }

  const lineEnding = lineEndingFor(existing);
  const block = normalizeLineEndings(
    `${PURRFOLD_MANAGED_BEGIN}\n${managedContent.trim()}\n${PURRFOLD_MANAGED_END}`,
    lineEnding
  );

  if (matches.length === 0) {
    if (existing.length === 0) {
      return `${block}${lineEnding}`;
    }

    const separator = existing.endsWith(lineEnding) ? lineEnding : `${lineEnding}${lineEnding}`;
    return `${existing}${separator}${block}${lineEnding}`;
  }

  let keptFirst = false;
  return existing.replace(managedBlockPattern, () => {
    if (keptFirst) {
      return '';
    }
    keptFirst = true;
    return block;
  });
}

function astroReadmeContent(options: CreateOptions) {
  const readme = renderReadme(options);
  const qualityStart = readme.indexOf('## Quality');

  if (qualityStart === -1) {
    throw new Error('Unable to locate the Purrfold quality guidance for Astro README.md.');
  }

  return readme.slice(qualityStart);
}

function astroAgentsContent(options: CreateOptions) {
  const agents = renderAgents(options);
  const qualityStart = agents.indexOf('## Quality Gates');

  if (qualityStart === -1) {
    throw new Error('Unable to locate the Purrfold quality guidance for Astro AGENTS.md.');
  }

  return agents.slice(qualityStart);
}

async function mergeAstroMarkdown(
  filePath: string,
  managedContent: string,
  executor: Executor,
  standaloneManagedContent = managedContent
) {
  const exists = await executor.pathExists(filePath);
  const existing = exists ? await executor.readFile(filePath) : '';
  const contentOutsideManagedBlocks = existing
    .replace(/<!-- BEGIN:purrfold-managed -->[\s\S]*?<!-- END:purrfold-managed -->/g, '')
    .trim();
  const content = contentOutsideManagedBlocks ? managedContent : standaloneManagedContent;
  await executor.writeFile(filePath, mergePurrfoldMarkdown(existing, content));
}

export async function installDocsAndClaude(
  projectRoot: string,
  options: CreateOptions,
  executor: Executor
) {
  const readmePath = path.join(projectRoot, 'README.md');
  const agentsPath = path.join(projectRoot, 'AGENTS.md');
  const claudePath = path.join(projectRoot, 'CLAUDE.md');

  if (options.framework === 'astro') {
    await mergeAstroMarkdown(readmePath, astroReadmeContent(options), executor);
    await mergeAstroMarkdown(
      agentsPath,
      astroAgentsContent(options),
      executor,
      renderAgents(options)
    );
  } else {
    await executor.writeFile(readmePath, renderReadme(options));
    await executor.writeFile(agentsPath, renderAgents(options));
  }

  await executor.writeFile(path.join(projectRoot, 'DESIGN.md'), designDoc);
  if (options.framework !== 'astro' || !(await executor.pathExists(claudePath))) {
    await executor.writeFile(claudePath, '@AGENTS.md\n');
  }

  await executor.writeFile(
    path.join(projectRoot, '.claude', 'hooks', 'react-doctor.ps1'),
    claudeReactDoctorHook
  );
  await executor.writeFile(
    path.join(projectRoot, '.claude', 'hooks', 'project-min-evaluation.ps1'),
    renderClaudeProjectMinEvaluationHook(options.packageManager, options.unit)
  );
  await executor.writeFile(path.join(projectRoot, '.claude', 'settings.json'), claudeSettings);

  await executor.symlinkOrJunction(
    path.join(projectRoot, '.agents', 'skills'),
    path.join(projectRoot, '.claude', 'skills')
  );
}
