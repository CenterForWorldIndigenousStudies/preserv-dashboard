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
    pathname: '/review-queue',
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

import { ReviewQueueTable } from '@organisms/ReviewQueueTable'

const filterOptions: FilterOptions = {
  collections: ['Collection A'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: ['APPROVED', 'NEEDS_REVIEW'],
}

describe('ReviewQueueTable adapter', () => {
  afterEach(() => {
    mocks.documentTableProps = undefined
    vi.clearAllMocks()
  })

  it('supplies review actions and selection through its own configuration', () => {
    renderToStaticMarkup(<ReviewQueueTable filterOptions={filterOptions} defaultStatuses={['NEEDS_REVIEW']} />)

    const config = mocks.documentTableProps?.config as {
      definition: {
        tableId: string
        columns: Array<{
          id?: string
          accessorKey?: string
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
    expect(config.definition.columns.map(({ header }) => header)).not.toContain('Review Reasons')

    const validationStatusCell = config.definition.columns.find(
      ({ accessorKey }) => accessorKey === 'validation_status',
    )?.Cell
    expect(validationStatusCell).toBeDefined()
    const cellMarkup = renderToStaticMarkup(
      <>
        {validationStatusCell?.({
          row: {
            original: {
              id: 'doc-1',
              name: 'Needs review document',
              id_legacy: null,
              filesize: null,
              hash_binary: null,
              hash_content: null,
              validation_status: 'NEEDS_REVIEW',
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
    expect(cellMarkup).toContain('NEEDS_REVIEW')
    expect(cellMarkup).toContain('View review reasons for document doc-1')

    const reviewDetailsCell = config.definition.columns.find(({ id }) => id === 'review_details')?.Cell
    expect(reviewDetailsCell).toBeDefined()
    const reviewDetailsMarkup = renderToStaticMarkup(
      <>
        {reviewDetailsCell?.({
          row: {
            original: {
              id: 'doc-2',
              name: 'Reviewed document',
              id_legacy: null,
              filesize: null,
              hash_binary: null,
              hash_content: null,
              validation_status: 'NEEDS_REVIEW',
              validation_timestamp: '2026-05-29T18:56:45.000Z',
              validator_name: 'Maria Reviewer',
              validation_comment: 'Review the source metadata.',
              validation_comment_additional: 'Confirm the collection assignment.',
              created_at: null,
              updated_at: null,
            } satisfies Document,
          },
        })}
      </>,
    )
    expect(reviewDetailsMarkup).toContain('2026-05-29 18:56 UTC')
    expect(reviewDetailsMarkup).toContain('Maria Reviewer')
    expect(reviewDetailsMarkup).toContain('Comments')
    expect(reviewDetailsMarkup).not.toContain('Human reviewed')
    expect(reviewDetailsMarkup.indexOf('2026-05-29 18:56 UTC')).toBeLessThan(
      reviewDetailsMarkup.indexOf('Maria Reviewer'),
    )
  })
})
