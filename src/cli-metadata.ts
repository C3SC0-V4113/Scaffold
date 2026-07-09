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
    flags: '--framework <next|astro>',
    description: 'Select the framework to scaffold.',
    default: 'next (or prompts, with Next as the default)',
  },
  {
    flags: '--ssr',
    description: 'Enable Astro SSR instead of a static build.',
    default: 'off',
  },
  {
    flags: '--adapter <node|vercel|netlify|cloudflare>',
    description: 'Astro SSR adapter to install when SSR is enabled.',
    default: 'cloudflare when SSR is enabled',
  },
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
    flags: '--motion',
    description: 'Install Motion for React and the motion-framer agent skill.',
    default: 'skipped (opt-in only)',
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
    description:
      'Extra arguments forwarded verbatim to `shadcn init` (including `--preset <id>`).',
    default: 'none',
  },
  {
    flags: '--mcp / --no-mcp',
    description: 'Install shadcn MCP for Claude, Codex, and OpenCode.',
    default: 'skipped',
  },
  {
    flags: '--icons <lucide|phosphor|tabler>',
    description: 'Icon library used for the cat on the home page.',
    default: "shadcn's choice, otherwise lucide",
  },
];

export const cliScenarios: CliScenario[] = [
  {
    intent: 'Scaffold a new app with the recommended defaults (unit tests, no e2e/commitlint)',
    command: 'npx purrfold@latest my-app --yes',
  },
  {
    intent: 'Scaffold an Astro app explicitly from the first prompt',
    command: 'npx purrfold@latest my-app --framework astro --yes',
  },
  {
    intent: 'Scaffold an Astro SSR app with the Cloudflare adapter',
    command: 'npx purrfold@latest my-app --framework astro --ssr --adapter cloudflare --yes',
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
    intent: 'Install Motion for React and its agent skill',
    command: 'npx purrfold@latest my-app --motion --yes',
  },
  {
    intent: 'Pick the icon library for the home page cat',
    command: 'npx purrfold@latest my-app --icons phosphor --yes',
  },
  {
    intent: 'Initialize shadcn MCP for Claude, Codex, and OpenCode',
    command: 'npx purrfold@latest my-app --mcp --yes',
  },
  {
    intent: 'Use a shadcn preset',
    command: 'npx purrfold@latest my-app --shadcn-args --preset b3REw8vwo --yes',
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
