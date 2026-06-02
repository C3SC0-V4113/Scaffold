export const claudeReactDoctorHook = `Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($projectRoot)) {
  $projectRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\\..')
}

Set-Location -LiteralPath $projectRoot

$reactDoctor = Join-Path $projectRoot 'node_modules\\.bin\\react-doctor.cmd'
if (Test-Path -LiteralPath $reactDoctor) {
  & cmd /c "\`"$reactDoctor\`" --verbose --diff --fail-on warning --no-score"
  exit $LASTEXITCODE
}

& cmd /c 'npx --yes react-doctor@latest --verbose --diff --fail-on warning --no-score'
exit $LASTEXITCODE
`;

export function renderClaudeProjectMinEvaluationHook(packageManager: string, includeUnit: boolean) {
  const scripts = ['lint', 'typecheck', 'format:check', ...(includeUnit ? ['test'] : []), 'doctor', 'check'];
  const runPrefix =
    packageManager === 'pnpm' ? 'pnpm run' : packageManager === 'bun' ? 'bun run' : 'npm run';

  return `Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($projectRoot)) {
  $projectRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\\..')
}

Set-Location -LiteralPath $projectRoot

$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace(($status | Out-String))) {
  exit 0
}

$scripts = @(${scripts.map((script) => `'${script}'`).join(', ')})
foreach ($scriptName in $scripts) {
  & cmd /c "${runPrefix} $scriptName"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
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
            "command": "powershell -NoProfile -ExecutionPolicy Bypass -Command \\"& { $project = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }; & (Join-Path $project '.claude/hooks/react-doctor.ps1') }\\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -NoProfile -ExecutionPolicy Bypass -Command \\"& { $project = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }; & (Join-Path $project '.claude/hooks/project-min-evaluation.ps1') }\\""
          }
        ]
      }
    ]
  }
}
`;
