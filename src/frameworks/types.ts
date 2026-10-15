import type {
  CreateOptions,
  Executor,
  Framework,
  PackageManager,
  AstroServerAdapter,
  IconLibrary,
  RouterChoice,
} from '../types.js';

/** FrameworkAdapter is the framework port; AstroServerAdapter is an Astro deploy adapter. */
export interface FrameworkAdapter {
  id: Framework;
  label: string;
  description: string;
  capabilities: {
    packageManagers: readonly PackageManager[];
    rendering?: {
      ssr: boolean;
      adapters?: readonly AstroServerAdapter[];
      defaultAdapter?: AstroServerAdapter;
    };
    routers: readonly RouterChoice[];
    defaultRouter?: RouterChoice;
  };
  layout: {
    sourceRoot: '' | 'src/';
    globalStylesheet: string;
    utilsPath: string;
    uiDir: string;
    motionMainPath: string;
    eslintConfigPath: 'eslint.config.js' | 'eslint.config.mjs';
    vitestConfigPath: 'vitest.config.ts' | 'vitest.config.mts';
  };
  dependencyOverrides: Readonly<Record<string, string>>;
  developmentDependencies: {
    core: readonly string[];
    unitExclusions: readonly string[];
  };
  packageScriptConfig: {
    doctor: string;
    doctorStaged: string;
    scanInit?: string;
    scan?: string;
    typecheck: string;
  };
  playwrightServer: { hostFlag: '--hostname' | '--host'; port: number };
  prettierConfig: {
    tailwindStylesheet: string;
    extraPlugins: readonly string[];
  };
  vitestConfig:
    | { kind: 'standalone'; tsconfigPaths: 'plugin' | 'native' }
    | { kind: 'merge-vite' };
  scaffold(options: CreateOptions, executor: Executor): Promise<string>;
  shadcnInitArgs(
    options: Pick<
      CreateOptions,
      'framework' | 'packageManager' | 'yes' | 'shadcnArgs'
    >,
  ): string[];
  cleanupStarter?(
    projectRoot: string,
    options: CreateOptions,
    executor: Executor,
  ): Promise<void>;
  writeAppShell(
    projectRoot: string,
    executor: Executor,
    iconLibrary: IconLibrary,
    motion: boolean,
  ): Promise<void>;
  templates: {
    eslint(options: CreateOptions): string;
    prettier(options: CreateOptions): string;
    vitest(options: Pick<CreateOptions, 'framework'>): string;
    unitSmokeTest(options: Pick<CreateOptions, 'framework'>): string;
    doctorConfig(options: CreateOptions): string;
  };
  packageScripts(
    options: Pick<
      CreateOptions,
      'framework' | 'packageManager' | 'unit' | 'e2e'
    >,
  ): Record<string, string>;
  skills(
    options: Pick<CreateOptions, 'framework' | 'unit' | 'e2e' | 'motion'>,
  ): string[];
  docs: {
    mergeStrategy: 'replace' | 'merge';
    agentsTemplate: 'next' | 'astro' | 'vite';
    frameworkName: string;
    readmeTitle: string;
    toolingLines: readonly string[];
    motionGuidance: string;
    motionAgentGuidance: string;
    doctorIgnoreMotionRule: boolean;
    agentsRules: string;
  };
}
