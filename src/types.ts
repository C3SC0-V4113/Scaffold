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
  /**
   * Whether to write GitHub Actions workflows into `.github/workflows/`.
   * Gates the whole directory; `e2e` still decides whether playwright.yml is
   * among the files written.
   */
  ci: boolean;
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
  /**
   * Run a command and return its trimmed stdout, or `undefined` when it cannot
   * be run (missing binary, non-zero exit, dry run). Callers must treat a
   * missing result as "unknown" and fall back rather than failing the scaffold.
   */
  capture(command: string, args: string[], options?: RunOptions): Promise<string | undefined>;
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
