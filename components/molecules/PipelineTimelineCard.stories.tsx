import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { PipelineTimelineCard } from '@molecules/PipelineTimelineCard'
import { createProcessBatch, createProcessStage } from '@molecules/processStoryFixtures'

const meta = {
  title: 'Molecules/PipelineTimelineCard',
  component: PipelineTimelineCard,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => (
      <Box sx={{ width: 'min(100%, 720px)', mx: 'auto' }}>
        <StoryComponent />
      </Box>
    ),
  ],
} satisfies Meta<typeof PipelineTimelineCard>

export default meta
type Story = StoryObj<typeof meta>

export const PipelineInProgress: Story = {
  args: {
    batch: createProcessBatch({
      ingester: createProcessStage({ status: 'completed', processedCount: 48, ingestedCount: 46 }),
      documentSplitter: createProcessStage({ status: 'completed', processedCount: 46, splitCount: 12 }),
      pageRotator: createProcessStage({ status: 'running', processedCount: 46, rotatedCount: 20 }),
      ocrProcessor: createProcessStage({ status: 'queued' }),
    }),
  },
}

export const CompletedPipeline: Story = {
  args: {
    batch: createProcessBatch({
      ingester: createProcessStage({ status: 'completed', processedCount: 48, ingestedCount: 46 }),
      documentSplitter: createProcessStage({ status: 'completed', processedCount: 46, splitCount: 12 }),
      pageRotator: createProcessStage({ status: 'completed', processedCount: 46, rotatedCount: 46 }),
      ocrProcessor: createProcessStage({ status: 'completed', processedCount: 46, ocrCompletedCount: 46 }),
      contentDedup: createProcessStage({ status: 'completed', processedCount: 46, exactDuplicateCount: 2 }),
      metadataExtractor: createProcessStage({ status: 'completed', processedCount: 44, extractedCount: 44 }),
      metadataValidator: createProcessStage({ status: 'completed', processedCount: 44, metadataValidatedCount: 44 }),
      rightsDeterminator: createProcessStage({ status: 'completed', processedCount: 44, rightsDeterminedCount: 44 }),
    }),
  },
}

export const FailedPipeline: Story = {
  args: {
    batch: createProcessBatch({
      ingester: createProcessStage({ status: 'completed', processedCount: 18, ingestedCount: 18 }),
      documentSplitter: createProcessStage({ status: 'failed', processedCount: 18, error: 'Splitter service failed.' }),
    }),
  },
}
