import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { ProcessStageMetricsGrid } from '@molecules/ProcessStageMetricsGrid'
import { createProcessStage } from './processStoryFixtures'

const meta = {
  title: 'Molecules/ProcessStageMetricsGrid',
  component: ProcessStageMetricsGrid,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 820 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessStageMetricsGrid>

export default meta
type Story = StoryObj<typeof meta>

export const IngestMetrics: Story = {
  args: {
    stageLabel: 'Ingest',
    stage: createProcessStage({ processedCount: 48, ingestedCount: 46, duplicateCount: 2, skippedSameOriginCount: 1 }),
  },
}

export const OcrMetrics: Story = {
  args: {
    stageLabel: 'OCR Processor',
    stage: createProcessStage({ processedCount: 46, ocrCompletedCount: 42, passedThroughCount: 4, reviewNeededCount: 2, failedCount: 2 }),
  },
}

export const SplitterMetrics: Story = {
  args: {
    stageLabel: 'Document Splitter',
    stage: createProcessStage({ processedCount: 46, splitCount: 8, childCount: 54, passedThroughCount: 38, reviewNeededCount: 1 }),
  },
}
