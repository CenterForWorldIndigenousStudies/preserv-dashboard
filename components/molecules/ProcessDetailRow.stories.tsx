import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProcessDetailRow } from '@molecules/ProcessDetailRow'

const meta = {
  title: 'Molecules/ProcessDetailRow',
  component: ProcessDetailRow,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 720 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessDetailRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Callback Delivery',
    value: 'Delivered successfully',
  },
}

export const LongValue: Story = {
  args: {
    label: 'Rollback',
    value: 'failed (deleted 12, restored 9, cancelled 0, failed 3, conflicts 4)',
  },
}
