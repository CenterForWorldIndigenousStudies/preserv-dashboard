// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

// @ts-check
// Note: This config manually configures Next.js/React rules instead of using
// eslint-config-next's 'next/core-web-vitals' because Next.js 16's config has
// circular references that cause issues with FlatCompat. This approach provides
// the same rules without the compatibility layer.
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config({
  ignores: [
    '**/.next/**',
    '.next/**',
    '.vscode/**',
    'coverage/**',
    'dist/**',
    'node_modules/**',
    'no_commit/**',
    '.eslintcache',
    'next-env.d.ts',
    '.storybook/**',
    'storybook-static/**',
    'stories/**'
  ],
}, eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked, {
  files: ['**/*.{ts,tsx}'],
  ignores: [],
  linterOptions: {
    reportUnusedDisableDirectives: 'error',
  },
  languageOptions: {
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    complexity: 'error',
    'default-case-last': 'error',
    'default-param-last': 'off',
    'dot-notation': 'off',
    eqeqeq: 'error',
    'guard-for-in': 'error',
    'max-depth': 'error',
    'no-await-in-loop': 'error',
    'no-duplicate-imports': 'error',
    'no-new-native-nonconstructor': 'error',
    'no-promise-executor-return': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unreachable-loop': 'error',
    'no-unused-private-class-members': 'error',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'no-useless-rename': 'error',
    'no-sequences': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'require-atomic-updates': 'error',
    'require-await': 'off',
    '@typescript-eslint/default-param-last': 'error',
    '@typescript-eslint/dot-notation': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-use-before-define': ['error', { functions: false, typedefs: false }],
    '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
  },
}, // Config files - disable type checking (not in tsconfig)
{
  files: ['eslint.config.mjs', '*.config.{js,mjs,ts}', 'jest.*.ts', 'tsup.config.ts', 'create/tsup.config.ts'],
  ...tseslint.configs.disableTypeChecked,
}, // Jest test files config
{
  files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
  rules: {
    // Jest mock method doesn't require binding
    '@typescript-eslint/unbound-method': 'off',
  },
}, storybook.configs["flat/recommended"]);
