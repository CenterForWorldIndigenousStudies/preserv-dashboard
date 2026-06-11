import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { IconSpinner } from '@atoms/icons/IconSpinner'

import { SidebarHeader } from '@atoms/SidebarHeader'

const meta = {
  title: 'Atoms/SidebarHeader',
  component: SidebarHeader,
  tags: ['autodocs'],
  args: {
    action: undefined,
    className: '',
    title: 'Preservation Pipeline',
  },
  argTypes: {
    action: {
      control: 'object',
      description: 'Optional React node to display as an action element on the right side of the header.',
    },
    className: {
      control: 'text',
      description: 'Optional additional CSS class names to apply to the header container.',
    },
    title: {
      control: 'text',
      description: 'The title to display in the sidebar header.',
    },
  },
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'padded',
  },
} satisfies Meta<typeof SidebarHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithAction: Story = {
  args: {
    action: (
      <IconSpinner/>
    ),
  },
}

export const WithBorderClass: Story = {
  args: {
    className: 'border-b border-moss/10',
  },
}
