import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProcessBatchMonitor } from './ProcessBatchMonitor'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatchStatus(): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-05-29T00:00:00.000Z',
    pipelineRequestedStages: ['document-splitter', 'page-rotator'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
  }
}

const meta = {
  title: 'Organisms/ProcessBatchMonitor',
  component: ProcessBatchMonitor,
  tags: ['autodocs'],
  args: {
    batches: [buildBatchStatus()],
  },
} satisfies Meta<typeof ProcessBatchMonitor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
