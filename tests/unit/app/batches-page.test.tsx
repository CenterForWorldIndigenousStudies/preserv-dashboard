import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetBatchOverviewMetrics, mockGetBatches, mockParseBatchQueryParams, mocks } = vi.hoisted(() => ({
  mockGetBatchOverviewMetrics: vi.fn(),
  mockGetBatches: vi.fn(),
  mockParseBatchQueryParams: vi.fn(),
  mocks: { batchesTableProps: undefined as Record<string, unknown> | undefined },
}))

vi.mock('@lib/queries/batchQueries', () => ({
  getBatchOverviewMetrics: mockGetBatchOverviewMetrics,
  getBatches: mockGetBatches,
  parseBatchQueryParams: mockParseBatchQueryParams,
}))

vi.mock('@organisms/BatchesTable', () => ({
  BatchesTable: (props: Record<string, unknown>) => {
    mocks.batchesTableProps = props
    return <div>Batch table stub</div>
  },
}))

import BatchesPage from '@root/app/batches/page'
import { PROCESS_DOCUMENTS_PATH } from '@constants/paths'

const initialQuery = {
  page: 2,
  pageSize: 50,
  search: 'batch',
  orderBy: 'name',
  sortDirection: 'asc' as const,
  filters: {},
}

const initialData = {
  data: [
    {
      id: 'batch-1',
      name: 'Batch One',
      startedAt: '2026-07-09T00:00:00.000Z',
      documentCount: 5,
      totalCost: '$12.50',
      processingTime: 42,
    },
  ],
  totalCount: 1,
  pageInfo: {
    pageSize: 50,
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: null,
    endCursor: null,
  },
}

describe('BatchesPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mocks.batchesTableProps = undefined
  })

  it('frames Batches as monitoring and links back to Process', async () => {
    mockParseBatchQueryParams.mockReturnValue(initialQuery)
    mockGetBatches.mockResolvedValue(initialData)
    mockGetBatchOverviewMetrics.mockResolvedValue({ totalBatches: 1, totalDocuments: 5 })

    const markup = renderToStaticMarkup(await BatchesPage({ searchParams: Promise.resolve({ search: 'batch' }) }))

    expect(markup).toContain('Monitor batch health and investigate batch history')
    expect(markup).toContain('Batches owns monitoring and investigation.')
    expect(markup).toContain('Back to Process')
    expect(markup).toContain(PROCESS_DOCUMENTS_PATH)
    expect(markup).toContain('Total Batches')
    expect(markup).toContain('Total Documents')
  })

  it('loads the parsed list query and passes the result to BatchesTable', async () => {
    const rawParams = { page: '2', pageSize: '50', search: 'batch', batchId: 'ignored' }
    mockParseBatchQueryParams.mockReturnValue(initialQuery)
    mockGetBatches.mockResolvedValue(initialData)
    mockGetBatchOverviewMetrics.mockResolvedValue({ totalBatches: 1, totalDocuments: 5 })

    renderToStaticMarkup(await BatchesPage({ searchParams: Promise.resolve(rawParams) }))

    expect(mockParseBatchQueryParams).toHaveBeenCalledWith(rawParams)
    expect(mockGetBatches).toHaveBeenCalledWith(initialQuery)
    expect(mockGetBatchOverviewMetrics).toHaveBeenCalledOnce()
    expect(mocks.batchesTableProps).toEqual({ initialData, initialQuery })
  })
})
