import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PipelineEventHistory } from '@molecules/PipelineEventHistory'

const meta = {
  title: 'Molecules/PipelineEventHistory',
  component: PipelineEventHistory,
  tags: ['autodocs'],
} satisfies Meta<typeof PipelineEventHistory>

export default meta
type Story = StoryObj<typeof meta>

export const FailedAndReviewNeeded: Story = {
  args: {
    defaultExpanded: true,
    batchLinks: {
      'batch-1': { name: 'September ingest', href: '/batches/batch-1' },
    },
    events: [
      {
        runKey: 'document-splitter-run',
        service: 'document_splitter',
        status: 'review_needed',
        timestamp: '2026-09-11T11:00:00Z',
        message: 'A boundary between source pages requires review.',
        requestId: 'request-2',
        batchId: 'batch-1',
        documentId: 'document-1',
        details: { sourcePage: 12, nextPage: 13 },
        severity: null,
      },
      {
        runKey: 'ocr-processor-run',
        service: 'ocr_processor',
        status: 'failed',
        timestamp: '2026-09-11T10:00:00Z',
        message: 'OCR timed out.',
        requestId: 'request-1',
        batchId: 'batch-1',
        documentId: 'document-1',
        details: { timeoutSeconds: 30 },
        severity: 'error',
      },
    ],
  },
}
