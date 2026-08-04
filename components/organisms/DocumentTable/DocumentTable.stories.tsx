import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { MRT_ColumnDef } from 'material-react-table'

import { DocumentTable, type DocumentTableProps } from './DocumentTable'
import type { DocumentTableConfig, DocumentTableFetchResult, DocumentTableQuery } from './types'
import type { FilterOptions } from '@lib/search'

interface StoryDocument {
  id: string
  name: string
  status: string
}

const rows: StoryDocument[] = [
  { id: 'doc-1', name: 'Community history collection', status: 'APPROVED' },
  { id: 'doc-2', name: 'Language revitalization report', status: 'NEEDS_REVIEW' },
]

const columns: MRT_ColumnDef<StoryDocument>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
]

const filterOptions: FilterOptions = {
  collections: ['Collection A'],
  accessLevels: ['open access', 'restricted', 'internal', 'confidential'],
  statuses: ['APPROVED', 'NEEDS_REVIEW'],
}

const initialQuery: DocumentTableQuery<Record<string, never>> = {
  page: 1,
  pageSize: 25,
  filters: {},
}

const initialData: DocumentTableFetchResult<StoryDocument> = {
  data: rows,
  totalCount: rows.length,
  pageInfo: {
    pageSize: 25,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
}

function storyFetcher(
  _query: DocumentTableQuery<Record<string, never>>,
): Promise<DocumentTableFetchResult<StoryDocument>> {
  return Promise.resolve(initialData)
}

function buildConfig(
  overrides: Partial<DocumentTableConfig<StoryDocument, Record<string, never>>> = {},
): DocumentTableConfig<StoryDocument, Record<string, never>> {
  return {
    definition: {
      tableId: 'storybook-documents',
      columns,
      fetcher: storyFetcher,
    },
    emptyMessage: 'No documents found.',
    searchPlaceholder: 'Search documents',
    ...overrides,
  }
}

function DocumentTableStory(props: DocumentTableProps<StoryDocument, Record<string, never>>) {
  return <DocumentTable {...props} />
}

const meta: Meta<typeof DocumentTableStory> = {
  title: 'Organisms/DocumentTable',
  component: DocumentTableStory,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultOverview: Story = {
  args: {
    config: buildConfig({
      advancedSearch: {
        filters: {},
        filterOptions,
        onApply: () => undefined,
      },
    }),
    initialQuery,
    initialData,
  },
}

export const ReviewQueueDense: Story = {
  args: {
    config: buildConfig({
      styleVariant: 'reviewQueueDense',
      rowActions: [
        {
          id: 'review',
          render: ({ row }) => <button type="button">Review {row.id}</button>,
        },
      ],
      enableRowSelection: true,
    }),
    initialQuery,
    initialData,
  },
}

export const ReadyForLibraryEmpty: Story = {
  args: {
    config: buildConfig({
      emptyMessage: 'No documents currently meet the readiness criteria.',
      advancedSearch: {
        filters: {},
        filterOptions,
        onApply: () => undefined,
      },
    }),
    initialQuery,
    initialData: { ...initialData, data: [], totalCount: 0 },
  },
}

export const FullAdvancedSearch: Story = {
  args: {
    config: buildConfig({
      advancedSearch: {
        filters: {
          author: 'Rÿser',
          tag: 'collection-tag',
          statuses: ['APPROVED'],
          documentType: 'unique',
          batch: 'batch-2026',
          createdFrom: '2026-01-01',
          createdTo: '2026-12-31',
          collection: 'Collection A',
          accessLevel: 'open access',
        },
        filterOptions,
        onApply: () => undefined,
      },
    }),
    initialQuery,
    initialData,
  },
}
