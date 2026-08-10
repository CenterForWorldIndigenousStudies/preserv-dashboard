import type { StoryObj } from '@storybook/nextjs-vite'
import { IconGoogle } from '@atoms/icons/IconGoogle'
import { IconPlus } from '@atoms/icons/IconPlus'
import { IconSpinner } from '@atoms/icons/IconSpinner'
import { IconX } from '@atoms/icons/IconX'

const meta = {
  title: 'Atoms/Icons',
  tags: ['autodocs'],
  args: {
    size: 20,
  },
  argTypes: {
    size: {
      control: 'select',
      options: [12, 16, 20, 24, 32],
      description: 'Icon size in pixels',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for custom styling',
    },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Plus: Story = {
  name: 'Plus Icon',
  args: {
    size: 20,
  },
  render: (args) => <IconPlus {...args} />,
}

export const Spinner: Story = {
  name: 'Spinner Icon',
  args: {
    size: 20,
    message: 'Loading...',
  },
  render: (args) => <IconSpinner {...args} />,
}

export const X: Story = {
  name: 'X Icon',
  args: {
    size: 20,
  },
  render: (args) => <IconX {...args} />,
}

export const Google: Story = {
  name: 'Google Icon',
  args: {
    size: 20,
  },
  render: (args) => <IconGoogle {...args} />,
}
