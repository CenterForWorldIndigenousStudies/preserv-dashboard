import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BATCH_LIFECYCLE_STATUSES } from '@constants/batchLifecycleStatuses'
import { BATCH_PUBLICATION_STATUSES } from '@constants/batchPublicationStatuses'

const {
  mockGetBatchOverviewMetrics,
  mockGetBatches,
  mockGetDocumentFilterOptions,
  mockParseBatchQueryParams,
  mocks,
} = vi.hoisted(() => ({
  mockGetBatchOverviewMetrics: vi.fn(),
  mockGetBatches: vi.fn(),
  mockGetDocumentFilterOptions: vi.fn(),
  mockParseBatchQueryParams: vi.fn(),
  mocks: { batchesTableProps: undefined as Record<string, unknown> | undefined },
}))

vi.mock('@lib/queries/batchQueries', () => ({
  getBatchOverviewMetrics: mockGetBatchOverviewMetrics,
  getBatches: mockGetBatches,
  parseBatchQueryParams: mockParseBatchQueryParams,
}))

vi.mock('@lib/queries/queries', () => ({
  getDocumentFilterOptions: mockGetDocumentFilterOptions,
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

const filterOptions = {
  collections: ['Collection A'],
  accessLevels: ['public'],
  statuses: ['APPROVED'],
  lifecycleStatuses: Object.values(BATCH_LIFECYCLE_STATUSES),
  publicationStatuses: Object.values(BATCH_PUBLICATION_STATUSES),
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
    mockGetDocumentFilterOptions.mockResolvedValue(filterOptions)

    const markup = renderToStaticMarkup(await BatchesPage({ searchParams: Promise.resolve({ search: 'batch' }) }))

    expect(markup).toContain('Monitor batch health and investigate batch history')
    expect(markup).toContain('Batches owns monitoring and investigation.')
    expect(markup).toContain('Back to Process')
    expect(markup).toContain(PROCESS_DOCUMENTS_PATH)
    expect(markup).toContain('Total Batches')
    expect(markup).toContain('Total Documents')
    expect(markup).toContain('Reprocessing cart')
    expect(markup).not.toContain('Draft reprocessing batches')
  })

  it('loads the parsed list query and passes the result to BatchesTable', async () => {
    const rawParams = { page: '2', pageSize: '50', search: 'batch', batchId: 'ignored' }
    mockParseBatchQueryParams.mockReturnValue(initialQuery)
    mockGetBatches.mockResolvedValue(initialData)
    mockGetBatchOverviewMetrics.mockResolvedValue({ totalBatches: 1, totalDocuments: 5 })
    mockGetDocumentFilterOptions.mockResolvedValue(filterOptions)

    renderToStaticMarkup(await BatchesPage({ searchParams: Promise.resolve(rawParams) }))

    expect(mockParseBatchQueryParams).toHaveBeenCalledWith(rawParams)
    expect(mockGetBatches).toHaveBeenCalledWith(initialQuery)
    expect(mockGetBatchOverviewMetrics).toHaveBeenCalledWith(initialQuery)
    expect(mockGetDocumentFilterOptions).toHaveBeenCalledOnce()
    expect(mocks.batchesTableProps).toEqual({ initialData, initialQuery, filterOptions })
  })
})
vi.mock('@lib/queries/reprocessingDraftQueries', () => ({
  getReprocessingDrafts: vi.fn().mockResolvedValue([]),
}))
