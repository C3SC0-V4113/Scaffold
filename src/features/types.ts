import type { FrameworkAdapter } from '../frameworks/types.js';
import type { CreateOptions, Executor, Framework } from '../types.js';

export type FeatureOptions = Pick<CreateOptions, 'motion'> & Partial<Pick<CreateOptions, 'query'>>;

export interface EslintFragment {
  files: string;
  rules: Readonly<Record<string, string>>;
  imports?: readonly string[];
  configs?: readonly string[];
}

export interface FeatureFileContext {
  adapter: FrameworkAdapter;
  options: Pick<CreateOptions, 'motion' | 'query' | 'unit' | 'router'>;
  projectRoot: string;
  stage: 'app-shell' | 'unit-tests';
}

export interface FeatureModule {
  id: string;
  enabled(options: FeatureOptions): boolean;
  skills(options: FeatureOptions): readonly string[];
  docs: Record<Framework, { readme: string; agents: string }>;
  install(context: {
    adapter: FrameworkAdapter;
    options: CreateOptions;
    executor: Executor;
    projectRoot: string;
  }): Promise<void>;
  files?(context: FeatureFileContext): readonly { path: string; content: string }[];
  lint?(options: FeatureOptions, framework: Framework): EslintFragment | undefined;
  doctorIgnoredRules?(options: FeatureOptions, framework: Framework): readonly string[];
}
