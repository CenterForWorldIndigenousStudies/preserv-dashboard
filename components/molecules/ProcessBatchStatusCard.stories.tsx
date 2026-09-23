import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import {
  DOCUMENT_SPLITTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
} from '@constants/pipeline'
import { LEGACY_IMPORT_MODE, LEGACY_IMPORT_STATUS_HISTORICAL } from '@constants/legacyImport'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { PIPELINE_STAGE_STATUSES } from '@constants/pipelineStageStatuses'
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
    (StoryComponent) => (
      <Box sx={{ m: '0 auto', maxWidth: 980 }}>
        <StoryComponent />
      </Box>
    ),
  ],
} satisfies Meta<typeof ProcessBatchStatusCard>

export default meta
type Story = StoryObj<typeof meta>

export const PipelineInProgress: Story = {
  args: {
    batch: createProcessBatch({
      batchName: 'Pipeline Run In Progress',
      ingester: createProcessStage({
        status: PIPELINE_STAGE_STATUSES.COMPLETED,
        processedCount: 42,
        ingestedCount: 40,
        duplicateCount: 2,
        completedAt: '2026-05-29T09:45:00.000Z',
      }),
      documentSplitter: createProcessStage({ status: PIPELINE_STAGE_STATUSES.COMPLETED, processedCount: 40, splitCount: 12 }),
      pageRotator: createProcessStage({
        status: PIPELINE_STAGE_STATUSES.RUNNING,
        processedCount: 40,
        rotatedCount: 26,
        passedThroughCount: 14,
      }),
      ocrProcessor: createProcessStage({ status: PIPELINE_STAGE_STATUSES.QUEUED }),
    }),
  },
}

export const CompletedWithReview: Story = {
  args: {
    batch: createProcessBatch({
      batchName: 'Completed Batch with Review Items',
      pipelineRequestedStages: [DOCUMENT_SPLITTER_SERVICE, PAGE_ROTATOR_SERVICE, OCR_PROCESSOR_SERVICE, METADATA_EXTRACTOR_SERVICE],
      ingester: createProcessStage({ status: PIPELINE_STAGE_STATUSES.COMPLETED, processedCount: 48, ingestedCount: 46, duplicateCount: 2 }),
      documentSplitter: createProcessStage({ status: PIPELINE_STAGE_STATUSES.COMPLETED, processedCount: 46, splitCount: 8, childCount: 54 }),
      pageRotator: createProcessStage({
        status: PIPELINE_STAGE_STATUSES.COMPLETED,
        processedCount: 54,
        rotatedCount: 35,
        passedThroughCount: 19,
      }),
      ocrProcessor: createProcessStage({ status: PIPELINE_STAGE_STATUSES.COMPLETED, processedCount: 54, ocrCompletedCount: 54 }),
      metadataExtractor: createProcessStage({
        status: PIPELINE_STAGE_STATUSES.COMPLETED,
        processedCount: 54,
        extractedCount: 54,
        needsReviewCount: 5,
        reviewNeededCount: 5,
        collectionName: 'Review Queue Collection',
        collectionNotes: 'Records requiring archivist review.',
        sourceFolderIds: ['drive-folder-1', 'drive-folder-2'],
      }),
    }),
  },
}

export const HistoricalLegacyBatch: Story = {
  args: {
    batch: createProcessBatch({
      batchName: 'Historical Data Combiner Batch',
      pipelineExecutionMode: LEGACY_IMPORT_MODE,
      legacyImportStatus: LEGACY_IMPORT_STATUS_HISTORICAL,
      lifecycleStatus: GENERATED_BATCH_LIFECYCLE_STATUSES.PUBLICATION_LOCKED,
    }),
  },
}
