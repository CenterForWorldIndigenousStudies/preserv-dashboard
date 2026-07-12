import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { ProcessBatchSummaryHeader } from '@molecules/ProcessBatchSummaryHeader'

const meta = {
  title: 'Molecules/ProcessBatchSummaryHeader',
  component: ProcessBatchSummaryHeader,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'centered',
  },
  decorators: [
    (StoryComponent) => <Box sx={{ width: 'min(100%, 720px)' }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessBatchSummaryHeader>

export default meta
type Story = StoryObj<typeof meta>

export const NamedBatch: Story = {
  args: {
    batchName: 'May 2026 Refugee Mental Health Ingest',
    batchId: 'batch-story-1',
    startedBy: 'archivist@example.org',
  },
}

export const BatchIdFallback: Story = {
  args: {
    batchName: '',
    batchId: 'batch-2026-05-29-001',
    startedBy: null,
  },
}
