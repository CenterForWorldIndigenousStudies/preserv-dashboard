import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/nextjs-vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@chromatic-com/storybook', '@storybook/addon-docs', '@storybook/addon-onboarding'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  staticDirs: [],
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  docs: {
    autodocs: 'tag',
  },
  build: {
    dir: '../public/storybook',
  },
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          // Stub @lib/db with a browser-safe no-op so Prisma (Node.js-only)
          // never enters the Storybook browser bundle.  The stories pass
          // initialData directly and never call any db function at runtime.
          '@lib/db': path.resolve(__dirname, '../lib/db.storybook.ts'),
        },
      },
      define: {
        ...config.define,
        // Polyfill process.env (Prisma generated code references it).
        'process.env': JSON.stringify({}),
        'process.stdout': 'undefined',
        'process.stderr': 'undefined',
        // The full process object so any transitive code that checks
        // process.env.NODE_ENV or process.platform does not throw.
        process: JSON.stringify({ env: {}, stdout: undefined, stderr: undefined }),
        global: 'globalThis',
      },
    }
  },
}

export default config
