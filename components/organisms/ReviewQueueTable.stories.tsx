import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { VALIDATION_STATUS_OPTIONS } from '@constants/validationStatuses'
import { REVIEW_QUEUE_PATH } from '@constants/paths'
import { ActionButton, ReviewQueueTable } from '@organisms/ReviewQueueTable'
import type { FilterOptions } from '@lib/search'
import type { Document } from 'types/documents'
import type { DocumentsPageResult } from 'types/pagination'
import { fn } from 'storybook/test'

const filterOptions: FilterOptions = {
  collections: ['Plateau', 'Southwest', 'Pacific Northwest'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: [...VALIDATION_STATUS_OPTIONS],
}

const documents: Document[] = [
  {
    id: 'review-document-1',
    name: 'Document requiring review',
    id_legacy: '1234',
    filesize: 1024,
    hash_binary: 'binary-hash-1',
    hash_content: 'content-hash-1',
    created_at: new Date('2026-05-01T12:00:00.000Z'),
    updated_at: new Date('2026-05-29T18:56:45.000Z'),
    validation_status: 'NEEDS_REVIEW',
    needs_review_reasons: [
      {
        serviceKey: 'document_splitter_1',
        serviceLabel: 'Document Splitter Pass 1',
        reasons: ['Ambiguous boundary between source pages 78 and 79.'],
      },
      {
        serviceKey: 'ocr_processor',
        serviceLabel: 'OCR Processor',
        reasons: ['OCR output confidence is too low for metadata extraction.'],
      },
    ],
    validation_timestamp: '2026-05-29T18:56:45.000Z',
    validator_name: 'Maria Reviewer',
    validation_comment: 'Review the source metadata.',
    validation_comment_additional: 'Confirm the collection assignment.',
  },
  {
    id: 'review-document-2',
    name: 'Another review document',
    id_legacy: '2345',
    filesize: 2048,
    hash_binary: 'binary-hash-2',
    hash_content: 'content-hash-2',
    created_at: new Date('2026-05-02T12:00:00.000Z'),
    updated_at: new Date('2026-05-30T18:56:45.000Z'),
    validation_status: 'FORMAT_ERRORS',
  },
]

function buildPageResult(data: Document[]): DocumentsPageResult {
  return {
    data,
    totalCount: data.length,
    pageInfo: {
      page: 1,
      pageSize: 25,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  }
}

const meta = {
  title: 'Organisms/ReviewQueueTable',
  component: ReviewQueueTable,
  tags: ['autodocs'],
  args: {
    initialData: buildPageResult(documents),
    filterOptions,
    defaultStatuses: ['NEEDS_REVIEW'],
  },
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'sand' },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: REVIEW_QUEUE_PATH,
        query: {
          page: '1',
          pageSize: '25',
        },
      },
    },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: '100%', px: { xs: 1, md: 3 }, py: 2 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof ReviewQueueTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    initialData: buildPageResult([]),
  },
}

export const DraftAssociatedRows: Story = {
  args: {
    initialData: buildPageResult([
      { ...documents[0], open_reprocessing_draft: { id: 'draft-1', name: 'OCR retry set' } },
      documents[1],
    ]),
  },
}

export const SelectedActions: Story = {
  render: () => (
    <ActionButton
      batchActionPending={false}
      selectedCount={2}
      hasSelectedDraftDocuments={false}
      onApprove={fn()}
      onReject={fn()}
      onReprocess={fn()}
      onRemove={fn()}
    />
  ),
}

export const SelectedActionsWithDraft: Story = {
  render: () => (
    <ActionButton
      batchActionPending={false}
      selectedCount={2}
      hasSelectedDraftDocuments
      onApprove={fn()}
      onReject={fn()}
      onReprocess={fn()}
      onRemove={fn()}
    />
  ),
}
