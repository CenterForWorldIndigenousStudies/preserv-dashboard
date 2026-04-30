import { createElement } from 'react'
import type { Decorator, Preview } from '@storybook/nextjs-vite'
import { SessionProvider } from 'next-auth/react'
import '../app/globals.css'

const withRootLayout: Decorator = (story) => {
  // Minimal decorator that ensures Tailwind is applied.
  // The actual root layout is applied per-story via nextjs-vite framework.
  return story()
}

const withSessionProvider: Decorator = (story) => {
  return createElement(SessionProvider, { session: null }, story())
}

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
    backgrounds: {
      default: 'sand',
      values: [
        { name: 'sand', value: '#f4f1f0' },
        { name: 'ink', value: '#231f20' },
        { name: 'white', value: '#ffffff' },
      ],
    },
    docs: {
      story: {
        inline: true,
      },
    },
  },
  decorators: [withRootLayout, withSessionProvider],
  tags: ['autodocs'],
}

export default preview
