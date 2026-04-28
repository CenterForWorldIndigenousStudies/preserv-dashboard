import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DocumentsTable } from '@components/organisms/DocumentsTable'
import type { Document, DocumentsPageResult } from '@lib/types'

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
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof DocumentsTable>

export default meta
type Story = StoryObj<typeof meta>

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

export const Default: Story = {
  args: {
    initialData: buildPageResult(mockDocuments),
  },
}

export const Empty: Story = {
  args: {
    initialData: buildPageResult([]),
  },
}

export const ManyResults: Story = {
  render: () => {
    const many = Array.from({ length: 25 }, (_, i): Document => ({
      id: storyUuid(),
      name: `Document ${i + 1}`,
      id_legacy: String(i + 4567),
      filesize: Math.floor(Math.random() * 10_000_000_000),
      hash_binary: `hash-${i}`,
      hash_content: `content-${i}`,
      created_at: new Date(Date.now() - i * 86400000),
      updated_at: new Date(Date.now() - i * 86400000),
    }))
    return <DocumentsTable initialData={buildPageResult(many)} />
  },
}
