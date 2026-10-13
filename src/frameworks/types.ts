import type { CreateOptions, Executor, Framework, PackageManager, AstroServerAdapter } from '../types.js';

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
  scaffold(options: CreateOptions, executor: Executor): Promise<string>;
  shadcnInitArgs(options: CreateOptions): string[];
  cleanupStarter?(projectRoot: string, options: CreateOptions, executor: Executor): Promise<void>;
  templates: {
    eslint(options: CreateOptions): string;
    prettier(options: CreateOptions): string;
    vitest(options: CreateOptions): string;
    unitSmokeTest(options: CreateOptions): string;
    appShell(options: CreateOptions): { root: string; page: string; rootPath: string; pagePath: string };
    doctorConfig(options: CreateOptions): string;
  };
  packageScripts(options: CreateOptions): Record<string, string>;
  skills(options: CreateOptions): string[];
  docs: { mergeStrategy: 'replace' | 'merge' };
}
