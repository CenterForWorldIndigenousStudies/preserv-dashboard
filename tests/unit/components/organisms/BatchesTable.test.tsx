import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { BATCHES_PATH } from '@constants/paths'

const { mockGetBatchesAction, mocks } = vi.hoisted(() => ({
  mockGetBatchesAction: vi.fn(),
  mocks: { documentTableProps: undefined as Record<string, unknown> | undefined },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => BATCHES_PATH,
  useRouter: () => ({ replace: vi.fn() }),
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

const row: BatchListItem = {
  id: 'batch/1',
  name: 'Batch One',
  idLegacy: 'LEGACY-BATCH-1',
  startedAt: '2026-07-09T00:00:00.000Z',
  documentCount: 5,
  totalCost: '$12.50',
  processingTime: 42,
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
        initialQuery={{ page: 1, pageSize: 25, filters: {} }}
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
      />,
    )

    const config = mocks.documentTableProps?.config as {
      definition: {
        columns: Array<{ header?: string; Cell?: (args: unknown) => ReactNode }>
        fetcher: (query: unknown) => Promise<unknown>
      }
      emptyMessage?: string
      searchPlaceholder?: string
    }

    expect(config).toMatchObject({
      definition: { tableId: 'batches' },
      emptyMessage: 'No batches are available.',
      searchPlaceholder: 'Search batches...',
    })
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

    const result = (await config.definition.fetcher({ page: 1, pageSize: 25, search: 'batch', filters: {} })) as {
      data: BatchListItem[]
      totalCount: number
    }

    expect(result).toEqual(expect.objectContaining({ data: [row], totalCount: 1 }))
    expect(mockGetBatchesAction).toHaveBeenCalledWith({ page: 1, pageSize: 25, search: 'batch', filters: {} })
  })
})
