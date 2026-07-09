export type Framework = 'next' | 'astro';

export type PackageManager = 'npm' | 'pnpm' | 'bun';

export type AstroServerAdapter = 'node' | 'vercel' | 'netlify' | 'cloudflare';

/** Icon libraries purrfold can wire into the generated home page. */
export type IconLibrary = 'lucide' | 'phosphor' | 'tabler';

/** shadcn MCP clients purrfold can initialize when explicitly requested. */
export type ShadcnMcpClient = 'claude' | 'codex' | 'opencode';

export interface CreateOptions {
  targetDir: string;
  framework: Framework;
  packageManager: PackageManager;
  ssr: boolean;
  astroAdapter?: AstroServerAdapter;
  unit: boolean;
  e2e: boolean;
  commitlint: boolean;
  /** Whether to install Motion and its agent skill. Opt-in only. */
  motion: boolean;
  yes: boolean;
  dryRun: boolean;
  skipInstall: boolean;
  shadcnArgs: string[];
  /** Whether to initialize shadcn MCP for supported local AI clients. */
  mcp: boolean;
  /** Forced icon library (from `--icons`); when unset, purrfold respects shadcn's choice. */
  icons?: IconLibrary;
}

export interface RunOptions {
  cwd?: string;
}

export interface Executor {
  run(command: string, args: string[], options?: RunOptions): Promise<void>;
  ensureDir(path: string): Promise<void>;
  pathExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  writeJson(path: string, value: unknown): Promise<void>;
  remove(path: string): Promise<void>;
  symlinkOrJunction(target: string, linkPath: string): Promise<void>;
}

export interface SkillInstallEntry {
  source: string;
  skill: string;
}

export interface SkillInstallManifest {
  skills: Record<string, SkillInstallEntry>;
}
