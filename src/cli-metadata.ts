// Single source of truth for purrfold's CLI surface. Consumed by the command
// definitions, the `--help` examples, and the machine-readable `info --json`
// output so the documented options can never drift from the real ones. The
// static docs (README, llms.txt, the Claude skill) mirror this content.

export interface CliOption {
  /** The flag as written on the command line, e.g. `--no-unit`. */
  flags: string;
  /** One-line description of what the flag does. */
  description: string;
  /** Default behavior when the flag is omitted (human readable). */
  default: string;
}

export interface CliScenario {
  /** Natural-language intent an agent or user might express. */
  intent: string;
  /** The exact command that satisfies the intent. */
  command: string;
}

export const installCommand = 'npx purrfold@latest <target-dir>';

export const cliOptions: CliOption[] = [
  {
    flags: '--pm <npm|pnpm|bun>',
    description: 'Package manager used to scaffold and install.',
    default: 'prompts, or npm with --yes',
  },
  {
    flags: '--unit / --no-unit',
    description: 'Include or skip Vitest + React Testing Library.',
    default: 'included',
  },
  {
    flags: '--e2e / --no-e2e',
    description: 'Include or skip Playwright end-to-end testing.',
    default: 'skipped',
  },
  {
    flags: '--commitlint / --no-commitlint',
    description: 'Include or skip commitlint and the commit-msg hook.',
    default: 'skipped',
  },
  {
    flags: '--yes',
    description: 'Use non-interactive defaults (no prompts).',
    default: 'interactive prompts',
  },
  {
    flags: '--dry-run',
    description: 'Print the operations without writing files or installing packages.',
    default: 'off',
  },
  {
    flags: '--skip-install',
    description: 'Generate quality files without installing extra quality dependencies.',
    default: 'off',
  },
  {
    flags: '--shadcn-args <args...>',
    description: 'Extra arguments forwarded verbatim to `shadcn init`.',
    default: 'none',
  },
];

export const cliScenarios: CliScenario[] = [
  {
    intent: 'Scaffold a new app with the recommended defaults (unit tests, no e2e/commitlint)',
    command: 'npx purrfold@latest my-app --yes',
  },
  {
    intent: 'Scaffold without any testing (no unit and no e2e)',
    command: 'npx purrfold@latest my-app --no-unit --no-e2e --yes',
  },
  {
    intent: 'Scaffold the full setup: unit + e2e + commitlint',
    command: 'npx purrfold@latest my-app --unit --e2e --commitlint --yes',
  },
  {
    intent: 'Use a specific package manager (pnpm or bun)',
    command: 'npx purrfold@latest my-app --pm pnpm --yes',
  },
  {
    intent: 'Preview what would happen without writing anything',
    command: 'npx purrfold@latest my-app --yes --dry-run',
  },
  {
    intent: 'Inspect every option as structured JSON (for agents)',
    command: 'npx purrfold@latest info --json',
  },
];
