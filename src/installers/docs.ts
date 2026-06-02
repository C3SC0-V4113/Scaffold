import path from 'node:path';

import {
  claudeReactDoctorHook,
  claudeSettings,
  renderClaudeProjectMinEvaluationHook,
} from '../templates/hooks.js';
import { designDoc, renderAgents, renderReadme } from '../templates/files.js';
import type { CreateOptions, Executor } from '../types.js';

export async function installDocsAndClaude(
  projectRoot: string,
  options: CreateOptions,
  executor: Executor
) {
  await executor.writeFile(path.join(projectRoot, 'README.md'), renderReadme(options));
  await executor.writeFile(path.join(projectRoot, 'DESIGN.md'), designDoc);
  await executor.writeFile(path.join(projectRoot, 'AGENTS.md'), renderAgents(options));
  await executor.writeFile(path.join(projectRoot, 'CLAUDE.md'), '@AGENTS.md\n');

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
