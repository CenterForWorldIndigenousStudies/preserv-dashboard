import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { NameElement } from './NameElement'

const meta = {
  title: 'Atoms/NameElement',
  component: NameElement,
  tags: ['autodocs'],
  args: {
    href: 'https://duckduckgo.com',
    name: "Some Document Name",
  },
  argTypes: {
    href: {
      control: 'text',
      description: 'An optional link',
    },
    name: {
      control: 'text',
      description: 'The actual name',
    },
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof NameElement>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Renders a document name with an optional link',
      },
    },
  },
}
