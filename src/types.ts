export type PackageManager = 'npm' | 'pnpm' | 'bun';

export interface CreateOptions {
  targetDir: string;
  packageManager: PackageManager;
  unit: boolean;
  e2e: boolean;
  commitlint: boolean;
  yes: boolean;
  dryRun: boolean;
  skipInstall: boolean;
  shadcnArgs: string[];
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
