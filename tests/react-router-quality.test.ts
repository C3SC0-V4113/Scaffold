import { describe, expect, it } from 'vitest';

import { reactRouterAdapter } from '../src/frameworks/react-router/index.js';
import type { CreateOptions } from '../src/types.js';

const options = {
  framework: 'react-router',
  motion: false,
} as CreateOptions;

describe('React Router quality tooling', () => {
  it('uses React Router doctor rules and ignores generated app paths', () => {
    const lint = reactRouterAdapter.templates.eslint(options);
    expect(lint).toContain('react-doctor/react-router-');
    expect(lint).toContain("'.react-router/**'");
    expect(lint).toContain("'app/components/ui/**'");
    expect(lint).toContain("'build/**'");
  });

  it('configures React Doctor for the framework-mode project', () => {
    expect(reactRouterAdapter.packageScriptConfig.doctor).toBe('react-doctor . --yes --blocking warning');
    expect(reactRouterAdapter.packageScriptConfig.doctorStaged).toBe(
      'react-doctor . --staged --blocking warning',
    );
  });
});
