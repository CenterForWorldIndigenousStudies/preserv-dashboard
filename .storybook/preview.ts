import type { Preview, Decorator } from '@storybook/nextjs-vite'
import '../app/globals.css'

const withRootLayout: Decorator = (story, context) => {
  // Minimal decorator that ensures Tailwind is applied
  // The actual root layout is applied per-story via nextjs-vite framework
  return story()
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
  decorators: [withRootLayout],
  tags: ['autodocs'],
}

export default preview
