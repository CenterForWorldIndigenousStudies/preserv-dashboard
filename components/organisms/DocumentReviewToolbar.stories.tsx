import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { buildDefaultReviewQueueChecklistState } from '@constants/reviewQueueChecklist'
import { DocumentReviewToolbar } from '@organisms/DocumentReviewToolbar'

const meta = {
  title: 'Organisms/DocumentReviewToolbar',
  component: DocumentReviewToolbar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Box sx={{ width: '100%', p: 2 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DocumentReviewToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const NeedsReview: Story = {
  args: {
    documentId: 'document-123',
    documentName: 'Document requiring review',
    validationStatus: 'NEEDS_REVIEW',
    reviewReasons: [
      {
        serviceKey: 'metadata_extractor',
        serviceLabel: 'Metadata Extractor',
        reasons: ['Missing rights statement.'],
      },
    ],
    reviewChecklist: buildDefaultReviewQueueChecklistState(),
    isCandidate: true,
    isCanonical: true,
    hasOpenReprocessingDraft: true,
    initialDrafts: [],
  },
}

export const ReadyWithoutReviewDetails: Story = {
  args: {
    documentId: 'document-456',
    documentName: 'Approved document',
    validationStatus: 'APPROVED',
    reviewChecklist: {
      ...buildDefaultReviewQueueChecklistState(),
      metadataReviewed: true,
      rightsReviewed: true,
    },
    isCandidate: false,
    isCanonical: false,
    hasOpenReprocessingDraft: false,
    initialDrafts: [],
  },
}
