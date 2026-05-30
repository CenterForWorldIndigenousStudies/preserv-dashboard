import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { STATUS_COLORS, StatusDot } from './StatusDot'

const meta = {
  title: 'Atoms/StatusDot',
  component: StatusDot,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: Object.keys(STATUS_COLORS),
      description: 'A Google Drive folder ID, plain text fallback, or empty value.',
    },
  },
  args: {
    status: 'pending',
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof StatusDot>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Default Status Dot',
  args: {},
}
