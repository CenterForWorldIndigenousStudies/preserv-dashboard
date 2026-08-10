// @vitest-environment jsdom

import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { BATCHES_PATH } from '@constants/paths'
import type { FilterOptions } from '@lib/search'

const { mockGetBatchesAction, mockRouterReplace, mocks } = vi.hoisted(() => ({
  mockGetBatchesAction: vi.fn(),
  mockRouterReplace: vi.fn(),
  mocks: { documentTableProps: undefined as Record<string, unknown> | undefined },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => BATCHES_PATH,
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => new URLSearchParams('page=2&pageSize=50'),
}))

vi.mock('@actions/batches', () => ({
  getBatchesAction: mockGetBatchesAction,
}))

vi.mock('@organisms/DocumentTable/DocumentTable', () => ({
  DocumentTable: ({ config }: { config: Record<string, unknown> }) => {
    mocks.documentTableProps = { config }
    return null
  },
}))

import { BatchesTable } from '@organisms/BatchesTable'
import type { BatchListItem } from 'types/batches'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const row: BatchListItem = {
  id: 'batch/1',
  name: 'Batch One',
  idLegacy: 'LEGACY-BATCH-1',
  startedAt: '2026-07-09T00:00:00.000Z',
  documentCount: 5,
  totalCost: '$12.50',
  processingTime: 42,
}

const filterOptions: FilterOptions = {
  collections: ['Collection A'],
  accessLevels: ['public'],
  statuses: ['APPROVED'],
}

const initialQuery = {
  page: 2,
  pageSize: 50,
  search: 'batch',
  orderBy: 'name',
  sortDirection: 'asc' as const,
  filters: {
    author: 'Ada',
    tag: 'Refugee',
    statuses: ['APPROVED'],
    documentType: 'duplicate' as const,
    batch: 'Special_RCR',
    createdFrom: '2026-01-01',
    createdTo: '2026-01-31',
    collection: 'Collection A',
    accessLevel: 'public' as const,
  },
}

describe('BatchesTable', () => {
  it('configures the generic table with batch columns and canonical links', async () => {
    mockGetBatchesAction.mockResolvedValue({
      data: [row],
      totalCount: 1,
      pageInfo: {
        pageSize: 25,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: { id: row.id, value: 'batch/1' },
        endCursor: { id: row.id, value: 'batch/1' },
      },
    })

    renderToStaticMarkup(
      <BatchesTable
        initialQuery={initialQuery}
        initialData={{
          data: [row],
          totalCount: 1,
          pageInfo: {
            pageSize: 25,
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        }}
        filterOptions={filterOptions}
      />,
    )

    const config = mocks.documentTableProps?.config as {
      definition: {
        columns: Array<{ header?: string; Cell?: (args: unknown) => ReactNode }>
        fetcher: (query: unknown) => Promise<unknown>
      }
      emptyMessage?: string
      searchPlaceholder?: string
      advancedSearch?: {
        filters: typeof initialQuery.filters
        filterOptions: FilterOptions
        onApply: (filters: typeof initialQuery.filters) => void
      }
    }

    expect(config).toMatchObject({
      definition: { tableId: 'batches' },
      emptyMessage: 'No batches are available.',
      searchPlaceholder: 'Search batches...',
    })
    expect(config.advancedSearch?.filters).toEqual(initialQuery.filters)
    expect(config.advancedSearch?.filterOptions).toEqual(filterOptions)
    expect(config.definition.columns.map((column) => column.header)).toEqual([
      'Batch',
      'Started',
      'Documents',
      'Total Cost',
      'Processing Time',
    ])

    const renderCell = (index: number) =>
      renderToStaticMarkup(config.definition.columns[index].Cell?.({ row: { original: row } }) ?? null)

    expect(renderCell(0)).toContain('/batches/batch%2F1')
    expect(renderCell(0)).toContain('Batch One')
    expect(renderCell(0)).toContain('ID batch/1')
    expect(renderCell(0)).toContain('Legacy LEGACY-BATCH-1')

    const result = (await config.definition.fetcher({ page: 1, pageSize: 25, search: 'batch', filters: initialQuery.filters })) as {
      data: BatchListItem[]
      totalCount: number
    }

    expect(result).toEqual(expect.objectContaining({ data: [row], totalCount: 1 }))
    expect(mockGetBatchesAction).toHaveBeenCalledWith({ page: 1, pageSize: 25, search: 'batch', filters: initialQuery.filters })
  })

  it('synchronizes Advanced Search filters into the Batches URL', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(
        <BatchesTable
          initialQuery={initialQuery}
          initialData={{
            data: [],
            totalCount: 0,
            pageInfo: {
              pageSize: 50,
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
          }}
          filterOptions={filterOptions}
        />,
      )
    })

    const nextUrl = mockRouterReplace.mock.calls[0]?.[0] as unknown
    expect(nextUrl).toEqual(expect.any(String))
    if (typeof nextUrl !== 'string') {
      throw new Error('Expected BatchesTable to replace the URL with a string')
    }
    expect(nextUrl).toContain('author=Ada')
    expect(nextUrl).toContain('tag=Refugee')
    expect(nextUrl).toContain('statuses=APPROVED')
    expect(nextUrl).toContain('documentType=duplicate')
    expect(nextUrl).toContain('batch=Special_RCR')
    expect(nextUrl).toContain('createdFrom=2026-01-01')
    expect(nextUrl).toContain('createdTo=2026-01-31')
    expect(nextUrl).toContain('collection=Collection+A')
    expect(nextUrl).toContain('accessLevel=public')

    act(() => {
      root.unmount()
    })
  })
})
