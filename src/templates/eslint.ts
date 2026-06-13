import type { CreateOptions } from '../types.js';

interface EslintConfigOptions extends Pick<CreateOptions, 'unit' | 'e2e'> {
  /**
   * Next's ESLint config already registers the `import` plugin. Future base
   * frameworks (Astro, TanStack Start, etc.) may not, so keep registration as an
   * explicit generator switch instead of removing support from the template.
   */
  registerImportPlugin?: boolean;
}

export function renderEslintConfig(options: EslintConfigOptions) {
  return `${options.unit ? "import vitest from '@vitest/eslint-plugin';\n" : ''}import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
${options.registerImportPlugin ? "import importPlugin from 'eslint-plugin-import';\n" : ''}${options.e2e ? "import playwrightPlugin from 'eslint-plugin-playwright';\n" : ''}import reactDoctor from 'eslint-plugin-react-doctor';
import reactYouMightNotNeedAnEffect from 'eslint-plugin-react-you-might-not-need-an-effect';
${options.unit ? "import testingLibraryPlugin from 'eslint-plugin-testing-library';\n" : ''}
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactDoctor.configs.recommended,
  reactDoctor.configs.next,
  reactYouMightNotNeedAnEffect.configs.recommended,
  {
${options.registerImportPlugin ? `    // Register the \`import\` plugin for base frameworks that do not provide it.
` : `    // The \`import\` plugin is already registered by eslint-config-next; we only
    // add resolver settings and ordering rules here. Re-registering the plugin
    // breaks under pnpm's isolated node_modules ("Cannot redefine plugin import").
`}    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
${options.registerImportPlugin ? `    plugins: {
      import: importPlugin,
    },
` : ''}    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
    },
  },
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react/boolean-prop-naming': [
        'error',
        {
          rule: '^(is|should|has|can|did|will|as)[A-Z]([A-Za-z0-9]?)+',
          message:
            "Boolean props should start with 'is', 'should', 'has', 'can', 'did', 'will', or 'as'",
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
${options.unit ? `  {
    files: [
      '**/*.{test,spec}.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
      'tests/unit/**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
      'tests/integration/**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
    ],
    ignores: ['tests/e2e/**', 'e2e/**', 'playwright/**'],
    plugins: vitest.configs.recommended.plugins,
    languageOptions: vitest.configs.env.languageOptions,
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
    },
  },
  {
    files: [
      '**/*.{test,spec}.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
      'tests/unit/**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
      'tests/integration/**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
    ],
    ignores: ['tests/e2e/**', 'e2e/**', 'playwright/**'],
    ...testingLibraryPlugin.configs['flat/react'],
  },
` : ''}${options.e2e ? `  {
    files: [
      'tests/e2e/**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
      'e2e/**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
      'playwright/**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
    ],
    ...playwrightPlugin.configs['flat/recommended'],
  },
` : ''}  eslintConfigPrettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.agents/**',
    '.claude/**',
    // Generated shadcn/ui primitives are vendored (radix/cva imports, dual
    // exports). They are type-checked by tsc and formatted by Prettier, but
    // not linted. Mirrors the \`components/ui/**\` exemption in doctor.config.json.
    'components/ui/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
`;
}
