export const claudeReactDoctorHook = `import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(projectRoot);

const localReactDoctor = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'react-doctor.cmd' : 'react-doctor',
);
const command = existsSync(localReactDoctor)
  ? '"' + localReactDoctor + '" --verbose --diff --blocking warning --no-score'
  : 'npx --yes react-doctor@latest --verbose --diff --blocking warning --no-score';
const result = spawnSync(command, { shell: true, stdio: 'inherit', cwd: projectRoot });
process.exit(result.status ?? 1);
`;

export function renderClaudeProjectMinEvaluationHook(packageManager: string, includeUnit: boolean) {
  const scripts = ['lint', 'typecheck', 'format:check', ...(includeUnit ? ['test'] : []), 'doctor', 'check'];
  const runPrefix =
    packageManager === 'pnpm' ? 'pnpm run' : packageManager === 'bun' ? 'bun run' : 'npm run';

  return `import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(projectRoot);

const status = spawnSync('git status --porcelain', {
  shell: true,
  cwd: projectRoot,
  encoding: 'utf8',
});
if (status.status !== 0) {
  process.exit(status.status ?? 1);
}
if (!status.stdout.trim()) {
  process.exit(0);
}

for (const scriptName of ${JSON.stringify(scripts)}) {
  const result = spawnSync(\`${runPrefix} \${scriptName}\`, {
    shell: true,
    stdio: 'inherit',
    cwd: projectRoot,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
`;
}

export const claudeSettings = `{
  "hooks": {
    "PostToolBatch": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["\${CLAUDE_PROJECT_DIR}/.claude/hooks/react-doctor.mjs"]
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["\${CLAUDE_PROJECT_DIR}/.claude/hooks/project-min-evaluation.mjs"]
          }
        ]
      }
    ]
  }
}
`;
