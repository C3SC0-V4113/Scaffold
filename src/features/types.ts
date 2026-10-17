import type { FrameworkAdapter } from '../frameworks/types.js';
import type { CreateOptions, Executor, Framework } from '../types.js';

export interface EslintFragment {
  files: string;
  rules: Readonly<Record<string, string>>;
}

export interface FeatureFileContext {
  adapter: FrameworkAdapter;
  options: CreateOptions;
  projectRoot: string;
  stage: 'app-shell' | 'unit-tests';
}

export interface FeatureModule {
  id: string;
  enabled(options: CreateOptions): boolean;
  skills(options: CreateOptions): readonly string[];
  docs: Record<Framework, { readme: string; agents: string }>;
  install(context: {
    adapter: FrameworkAdapter;
    options: CreateOptions;
    executor: Executor;
    projectRoot: string;
  }): Promise<void>;
  files?(context: FeatureFileContext): readonly { path: string; content: string }[];
  lint?(options: CreateOptions, adapter: FrameworkAdapter): EslintFragment | undefined;
  doctorIgnoredRules?(options: CreateOptions, adapter: FrameworkAdapter): readonly string[];
}
