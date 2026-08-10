import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { VALIDATION_STATUS_OPTIONS } from '@constants/validationStatuses'
import { DocumentsTable } from '@organisms/DocumentsTable'
import type { FilterOptions } from '@lib/search'
import type { Document } from 'types/documents'
import type { DocumentsPageResult } from 'types/pagination'
import { DOCUMENTS_PATH } from '@constants/paths'

const mockDocuments: Document[] = [
  {
    id: storyUuid(),
    name: 'Annual Report 2024',
    id_legacy: '1234',
    filesize: 2456000,
    hash_binary: 'abc123',
    hash_content: 'def456',
    created_at: new Date('2024-03-15T10:30:00.000Z'),
    updated_at: new Date('2024-03-15T10:30:00.000Z'),
  },
  {
    id: storyUuid(),
    name: 'Field Survey Data - Arizona',
    id_legacy: '2345',
    filesize: 890000,
    hash_binary: 'ghi789',
    hash_content: 'jkl012',
    created_at: new Date('2024-06-22T14:15:00.000Z'),
    updated_at: new Date('2024-06-22T14:15:00.000Z'),
  },
  {
    id: storyUuid(),
    name: 'Ethnographic Notes Vol. III',
    id_legacy: '3456',
    filesize: 142000000,
    hash_binary: 'mno345',
    hash_content: 'pqr678',
    created_at: new Date('2023-11-05T09:00:00.000Z'),
    updated_at: new Date('2023-11-05T09:00:00.000Z'),
  },
]

const filterOptions: FilterOptions = {
  collections: ['Plateau', 'Southwest', 'Pacific Northwest'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: [...VALIDATION_STATUS_OPTIONS],
}

function buildPageResult(data: Document[]): DocumentsPageResult {
  return {
    data,
    pageInfo: {
      page: 1,
      pageSize: data.length || 25,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  }
}

/**
 * Browser-safe UUID replacement for Storybook stories.
 * `crypto.randomUUID()` is available in all modern browsers.
 * Fallback uses Math.random for environments where it is not available.
 */
function storyUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const meta = {
  title: 'Organisms/DocumentsTable',
  component: DocumentsTable,
  tags: ['autodocs'],
  args: {
    initialData: buildPageResult(mockDocuments),
    filterOptions,
  },
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'sand' },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: DOCUMENTS_PATH,
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
} satisfies Meta<typeof DocumentsTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Empty: Story = {
  args: {
    initialData: buildPageResult([]),
    filterOptions,
  },
}

export const ManyResults: Story = {
  args: {
    filterOptions,
  },
  render: () => {
    const many = Array.from(
      { length: 25 },
      (_, i): Document => ({
        id: storyUuid(),
        name: `Document ${i + 1}`,
        id_legacy: String(i + 4567),
        filesize: Math.floor(Math.random() * 10_000_000_000),
        hash_binary: `hash-${i}`,
        hash_content: `content-${i}`,
        created_at: new Date(Date.now() - i * 86400000),
        updated_at: new Date(Date.now() - i * 86400000),
      }),
    )
    return <DocumentsTable initialData={buildPageResult(many)} filterOptions={filterOptions} />
  },
}

export const ReviewQueueVariant: Story = {
  args: {
    initialData: buildPageResult(
      mockDocuments.map((document, index) => ({
        ...document,
        validation_status: index === 0 ? 'NEEDS_REVIEW' : index === 1 ? 'APPROVED' : 'REJECTED',
        needs_review_reasons:
          index === 0
            ? [
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
              ]
            : [],
      })),
    ),
    filterOptions,
    variant: 'reviewQueue',
  },
}
