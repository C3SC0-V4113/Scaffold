import type { CreateOptions, Executor, Framework, PackageManager, AstroServerAdapter, IconLibrary } from '../types.js';

/** FrameworkAdapter is the framework port; AstroServerAdapter is an Astro deploy adapter. */
export interface FrameworkAdapter {
  id: Framework;
  label: string;
  description: string;
  capabilities: {
    packageManagers: readonly PackageManager[];
    rendering?: { ssr: boolean; adapters?: readonly AstroServerAdapter[]; defaultAdapter?: AstroServerAdapter };
    routers: readonly string[];
  };
  layout: {
    sourceRoot: '' | 'src/';
    globalStylesheet: string;
    utilsPath: string;
    uiDir: string;
    motionMainPath: string;
  };
  dependencyOverrides: Readonly<Record<string, string>>;
  developmentDependencies: { core: readonly string[]; unitExclusions: readonly string[] };
  packageScriptConfig: { doctor: string; doctorStaged: string; scanInit?: string; scan?: string; typecheck: string };
  prettierConfig: { tailwindStylesheet: string; extraPlugins: readonly string[] };
  vitestConfig: { tsconfigPaths: 'plugin' | 'native' };
  scaffold(options: CreateOptions, executor: Executor): Promise<string>;
  shadcnInitArgs(options: Pick<CreateOptions, 'framework' | 'packageManager' | 'yes' | 'shadcnArgs'>): string[];
  cleanupStarter?(projectRoot: string, options: CreateOptions, executor: Executor): Promise<void>;
  writeAppShell(projectRoot: string, executor: Executor, iconLibrary: IconLibrary, motion: boolean): Promise<void>;
  templates: {
    eslint(options: CreateOptions): string;
    prettier(options: CreateOptions): string;
    vitest(options: Pick<CreateOptions, 'framework'>): string;
    unitSmokeTest(options: Pick<CreateOptions, 'framework'>): string;
    doctorConfig(options: CreateOptions): string;
  };
  packageScripts(options: Pick<CreateOptions, 'framework' | 'packageManager' | 'unit' | 'e2e'>): Record<string, string>;
  skills(options: Pick<CreateOptions, 'framework' | 'unit' | 'e2e' | 'motion'>): string[];
  docs: {
    mergeStrategy: 'replace' | 'merge';
    frameworkName: string;
    readmeTitle: string;
    toolingLines: readonly string[];
    motionGuidance: string;
    motionAgentGuidance: string;
    doctorIgnoreMotionRule: boolean;
    agentsRules: string;
  };
}
