import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { BatchOverviewFields } from '@molecules/BatchOverviewFields'

const meta = {
  title: 'Molecules/BatchOverviewFields',
  component: BatchOverviewFields,
  tags: ['autodocs'],
  decorators: [
    (StoryComponent) => (
      <Box sx={{ m: '0 auto', maxWidth: 980 }}>
        <StoryComponent />
      </Box>
    ),
  ],
} satisfies Meta<typeof BatchOverviewFields>

export default meta
type Story = StoryObj<typeof meta>

export const ProcessingBatch: Story = {
  args: {
    createdAt: '2026-09-01T10:00:00.000Z',
    startedAt: '2026-09-05T10:00:00.000Z',
    requestedStages: ['ocr_processor', 'metadata_extractor'],
    lifecycleStatus: 'running',
    publicationStatus: 'not_started',
  },
}

export const DraftBatch: Story = {
  args: {
    createdAt: '2026-09-01T10:00:00.000Z',
    startedAt: null,
    requestedStages: ['ocr_processor'],
    lifecycleStatus: 'draft',
    publicationStatus: 'not_started',
  },
}
