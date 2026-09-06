import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentBatchAssociations } from '@organisms/DocumentBatchAssociations'
import type { DocumentToBatch } from 'types/documents'

const batchAssociations: DocumentToBatch[] = [
  {
    id: 'link-1',
    document_id: 'doc-1',
    batch_id: 'batch-1',
    added_at: '2026-06-03T08:00:00Z',
    batch_origin: 'Drive ingest folder A',
    cost: '$0.00',
    processing_time_seconds: 42,
    ocr_quality_low: false,
    ocr_quality_medium: true,
    batch_legacy_id: 'legacy-batch-1',
    batch_name: 'June 3 Ingest',
    batch_status: 'complete',
  },
  {
    id: 'link-2',
    document_id: 'doc-1',
    batch_id: 'batch-2',
    added_at: '2026-06-04T10:30:00Z',
    batch_origin: 'Manual reprocessing',
    cost: '$0.12',
    processing_time_seconds: 18,
    ocr_quality_low: null,
    ocr_quality_medium: null,
    batch_legacy_id: null,
    batch_name: 'June 4 Reprocessing',
    batch_status: 'running',
  },
]

const meta = {
  title: 'Organisms/DocumentBatchAssociations',
  component: DocumentBatchAssociations,
  tags: ['autodocs'],
  args: {
    batchAssociations,
    batchReturnHref: '/documents/doc-1',
    batchReturnLabel: 'Document Detail',
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 'min(100%, 80rem)', mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DocumentBatchAssociations>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
