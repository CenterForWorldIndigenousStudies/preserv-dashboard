import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MetadataExtractorStageCard } from '@molecules/MetadataExtractorStageCard'
import { createProcessBatch, createProcessStage, processPipelineConfig } from './processStoryFixtures'

const meta = {
  title: 'Molecules/MetadataExtractorStageCard',
  component: MetadataExtractorStageCard,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 820 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof MetadataExtractorStageCard>

export default meta
type Story = StoryObj<typeof meta>

export const Direct: Story = {
  args: {
    batch: createProcessBatch(),
    stage: createProcessStage({
      status: 'completed',
      mode: 'direct',
      processedCount: 48,
      extractedCount: 46,
      reviewNeededCount: 2,
    }),
  },
}

export const OpenAIBatch: Story = {
  args: {
    batch: createProcessBatch({
      pipelineConfig: {
        ...processPipelineConfig,
        metadataExtraction: { mode: 'openai_batch' },
      },
    }),
    stage: createProcessStage({
      status: 'running',
      mode: 'openai_batch',
      processedCount: 48,
      extractedCount: 0,
      openaiBatchWave1: {
        status: 'submitted',
        openaiBatchId: 'provider-batch-wave-1',
        submittedAt: '2026-05-29T10:00:00.000Z',
        checkedAt: null,
        completedAt: null,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        failures: [],
      },
      openaiBatchWave2: null,
    }),
  },
}
