import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Badge } from '@atoms/Badges/Badge'
import { NeedsReviewReasonsPopover } from './NeedsReviewReasonsPopover'

const meta = {
  title: 'Molecules/NeedsReviewReasonsPopover',
  component: NeedsReviewReasonsPopover,
  tags: ['autodocs'],
} satisfies Meta<typeof NeedsReviewReasonsPopover>

export default meta
type Story = StoryObj<typeof meta>

export const MultipleReasons: Story = {
  args: {
    documentId: 'document-123',
    groups: [
      {
        serviceKey: 'document_splitter_1',
        serviceLabel: 'Document Splitter Pass 1',
        reasons: [
          'Ambiguous boundary between source pages 78 and 79 (logical boundary 136)',
          'Ambiguous boundary between source pages 84 and 85 (logical boundary 142)',
        ],
      },
      {
        serviceKey: 'ocr_processor',
        serviceLabel: 'OCR Processor',
        reasons: ['OCR output confidence is too low for metadata extraction.'],
      },
    ],
  },
}

export const SingleReason: Story = {
  args: {
    documentId: 'document-456',
    groups: [
      {
        serviceKey: 'page_rotator_2',
        serviceLabel: 'Page Rotator Pass 2',
        reasons: ['Mixed page orientations require manual review.'],
      },
    ],
  },
}

export const Empty: Story = {
  args: {
    documentId: 'document-789',
    groups: [],
  },
}

export const StatusPillTrigger: Story = {
  args: {
    documentId: 'document-123',
    trigger: <Badge variant={'danger'}>{'NEEDS_REVIEW'}</Badge>,
    triggerLabel: 'View review reasons for document document-123',
    groups: [
      {
        serviceKey: 'document_splitter_1',
        serviceLabel: 'Document Splitter Pass 1',
        reasons: ['Ambiguous document boundary requires review.'],
      },
    ],
  },
}
