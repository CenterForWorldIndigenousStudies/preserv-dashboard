import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'

import { playwright } from '@vitest/browser-playwright'

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const testEnvPath = path.join(dirname, '.env.test')

if (fs.existsSync(testEnvPath)) {
  process.loadEnvFile(testEnvPath)
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'react-transition-group/TransitionGroupContext',
        replacement: path.resolve(
          dirname,
          'node_modules/react-transition-group/cjs/TransitionGroupContext.js',
        ),
      },
      { find: '@actions', replacement: path.resolve(dirname, 'app/actions') },
      { find: '@atoms', replacement: path.resolve(dirname, 'components/atoms') },
      { find: '@components', replacement: path.resolve(dirname, 'components') },
      { find: '@constants', replacement: path.resolve(dirname, 'constants') },
      { find: '@contracts', replacement: path.resolve(dirname, 'contracts') },
      { find: '@hooks', replacement: path.resolve(dirname, 'hooks') },
      { find: '@lib', replacement: path.resolve(dirname, 'lib') },
      { find: '@molecules', replacement: path.resolve(dirname, 'components/molecules') },
      { find: '@organisms', replacement: path.resolve(dirname, 'components/organisms') },
      { find: '@root', replacement: path.resolve(dirname, '') },
      { find: 'types', replacement: path.resolve(dirname, 'types') },
    ],
  },
  ssr: {
    noExternal: ['@mui/material', 'react-transition-group'],
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          setupFiles: [],
          environment: 'node',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          globals: true,
          setupFiles: [],
          environment: 'node',
          hookTimeout: 30000,
          testTimeout: 30000,
          include: ['tests/integration/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
})
