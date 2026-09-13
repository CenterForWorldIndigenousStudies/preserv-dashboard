import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentBatchesSection } from '@organisms/DocumentBatchesSection'
import type { DocumentDetail } from 'types/documents'

const meta = {
  title: 'Organisms/DocumentBatchesSection',
  component: DocumentBatchesSection,
  tags: ['autodocs'],
  parameters: { layout: 'padded', a11y: { disable: true } },
  args: {
    batchAssociations: [
      {
        id: 'link-1',
        document_id: 'document-1',
        batch_id: 'batch-1',
        added_at: '2026-06-03T08:00:00Z',
        batch_started_at: '2026-06-03T09:00:00Z',
        batch_document_count: 7,
        batch_origin: 'Drive ingest folder A',
        cost: '$0.12',
        processing_time_seconds: 42,
        ocr_quality_low: false,
        ocr_quality_medium: true,
        batch_legacy_id: null,
        batch_name: 'June 3 Ingest',
        batch_status: 'complete',
      },
    ],
    batchReturnHref: '/documents/document-1',
    batchReturnLabel: 'document Community history collection.pdf',
    readiness: {
      isPreservationCandidate: true,
      approved: true,
      unmetRequirements: [],
      reasonGroups: [],
    } satisfies NonNullable<DocumentDetail['readiness']>,
    activeReviewReasons: [],
    pipelineEvents: [],
    pipelineBatchLinks: {},
  },
} satisfies Meta<typeof DocumentBatchesSection>

export default meta
type Story = StoryObj<typeof meta>

export const WithBatchAndDiagnostics: Story = {}

export const NoBatchAssociations: Story = {
  args: { batchAssociations: [], readiness: null },
}
