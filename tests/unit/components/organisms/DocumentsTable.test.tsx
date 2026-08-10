import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FilterOptions } from '@lib/search'
import type { Document } from 'types/documents'

const mocks = vi.hoisted(() => ({
  documentTableProps: undefined as Record<string, unknown> | undefined,
  state: {
    accessLevel: undefined,
    batch: undefined,
    collection: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    documentType: 'all',
    globalFilter: '',
    pathname: '/documents',
    page: 1,
    pageSize: 25,
    queryParams: { page: 1, pageSize: 25 },
    searchParams: new URLSearchParams(),
    statuses: undefined,
    tag: undefined,
    setGlobalFilter: vi.fn(),
    setOverviewFilters: vi.fn(),
    setPageSize: vi.fn(),
    setSorting: vi.fn(),
    sorting: [],
    goToNextPage: vi.fn(),
    goToPreviousPage: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@hooks/useOverviewTableState', () => ({
  useOverviewTableState: () => mocks.state,
}))

vi.mock('@organisms/DocumentTable/DocumentTable', () => ({
  DocumentTable: (props: Record<string, unknown>) => {
    mocks.documentTableProps = props
    return <div data-testid="document-table">Document table</div>
  },
}))

import { DocumentsTable } from '@organisms/DocumentsTable'

const filterOptions: FilterOptions = {
  collections: ['Collection A'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: ['APPROVED', 'NEEDS_REVIEW'],
}

describe('DocumentsTable adapter', () => {
  afterEach(() => {
    mocks.documentTableProps = undefined
    vi.clearAllMocks()
  })

  it('supplies the overview configuration to the shared table shell', () => {
    renderToStaticMarkup(<DocumentsTable filterOptions={filterOptions} />)

    const config = mocks.documentTableProps?.config as {
      definition: { tableId: string }
      advancedSearch?: unknown
    }

    expect(config.definition.tableId).toBe('overview-documents')
    expect(config.advancedSearch).toBeDefined()
  })

  it('supplies review actions and selection through the shared configuration', () => {
    renderToStaticMarkup(
      <DocumentsTable filterOptions={filterOptions} variant="reviewQueue" defaultStatuses={['NEEDS_REVIEW']} />,
    )

    const config = mocks.documentTableProps?.config as {
      definition: {
        tableId: string
        columns: Array<{
          id?: string
          header?: string
          Cell?: (props: { row: { original: Document } }) => ReactNode
        }>
      }
      rowActions?: Array<{ id: string }>
      enableRowSelection?: boolean
    }

    expect(config.definition.tableId).toBe('review-queue-documents')
    expect(config.rowActions?.map(({ id }) => id)).toEqual(['review-decisions'])
    expect(config.enableRowSelection).toBe(true)
    expect(config.definition.columns.map(({ header }) => header)).toContain('Review Reasons')

    const reviewReasonsCell = config.definition.columns.find(({ id }) => id === 'review_reasons')?.Cell
    expect(reviewReasonsCell).toBeDefined()
    const cellMarkup = renderToStaticMarkup(
      <>
        {reviewReasonsCell?.({
          row: {
            original: {
              id: 'doc-1',
              name: 'Needs review document',
              id_legacy: null,
              filesize: null,
              hash_binary: null,
              hash_content: null,
              created_at: null,
              updated_at: null,
              needs_review_reasons: [
                {
                  serviceKey: 'document_splitter_1',
                  serviceLabel: 'Document Splitter Pass 1',
                  reasons: ['Boundary requires review.', 'Another boundary requires review.'],
                },
              ],
            } satisfies Document,
          },
        })}
      </>,
    )
    expect(cellMarkup).toContain('2 reasons')
  })
})
