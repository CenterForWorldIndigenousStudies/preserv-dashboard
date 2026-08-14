import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { ProcessBatchStatusCard } from '@molecules/ProcessBatchStatusCard'
import { createProcessBatch, createProcessStage } from './processStoryFixtures'

const meta = {
  title: 'Molecules/ProcessBatchStatusCard',
  component: ProcessBatchStatusCard,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 980 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessBatchStatusCard>

export default meta
type Story = StoryObj<typeof meta>

export const PipelineInProgress: Story = {
  args: {
    batch: createProcessBatch({
      batchName: 'Pipeline Run In Progress',
      ingester: createProcessStage({
        status: 'completed',
        processedCount: 42,
        ingestedCount: 40,
        duplicateCount: 2,
        completedAt: '2026-05-29T09:45:00.000Z',
      }),
      documentSplitter: createProcessStage({ status: 'completed', processedCount: 40, splitCount: 12 }),
      pageRotator: createProcessStage({ status: 'running', processedCount: 40, rotatedCount: 26, passedThroughCount: 14 }),
      ocrProcessor: createProcessStage({ status: 'queued' }),
    }),
  },
}

export const CompletedWithReview: Story = {
  args: {
    batch: createProcessBatch({
      batchName: 'Completed Batch with Review Items',
      pipelineRequestedStages: ['document-splitter', 'page-rotator', 'ocr-processor', 'metadata-validation'],
      ingester: createProcessStage({ status: 'completed', processedCount: 48, ingestedCount: 46, duplicateCount: 2 }),
      documentSplitter: createProcessStage({ status: 'completed', processedCount: 46, splitCount: 8, childCount: 54 }),
      pageRotator: createProcessStage({ status: 'completed', processedCount: 54, rotatedCount: 35, passedThroughCount: 19 }),
      ocrProcessor: createProcessStage({ status: 'completed', processedCount: 54, ocrCompletedCount: 54 }),
      metadataValidator: createProcessStage({
        status: 'completed',
        processedCount: 54,
        metadataValidatedCount: 49,
        needsReviewCount: 5,
        reviewNeededCount: 5,
        collectionName: 'Review Queue Collection',
        collectionNotes: 'Records requiring archivist review.',
        sourceFolderIds: ['drive-folder-1', 'drive-folder-2'],
      }),
    }),
  },
}
