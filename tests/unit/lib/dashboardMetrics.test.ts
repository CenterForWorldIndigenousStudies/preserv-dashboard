import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetNeedsReviewDocumentsCount,
  mockGetProcessBatchStatuses,
  mockGetReadyForLibraryDocuments,
  mockHasTerminalPipelineFailure,
  mockIsPipelineBatchTerminal,
} = vi.hoisted(() => ({
  mockGetNeedsReviewDocumentsCount: vi.fn(),
  mockGetProcessBatchStatuses: vi.fn(),
  mockGetReadyForLibraryDocuments: vi.fn(),
  mockHasTerminalPipelineFailure: vi.fn(),
  mockIsPipelineBatchTerminal: vi.fn(),
}))

vi.mock('@lib/queries/queries', () => ({
  getNeedsReviewDocumentsCount: mockGetNeedsReviewDocumentsCount,
  getReadyForLibraryDocuments: mockGetReadyForLibraryDocuments,
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatuses: mockGetProcessBatchStatuses,
}))

vi.mock('@lib/pipelineExecution', () => ({
  hasTerminalPipelineFailure: mockHasTerminalPipelineFailure,
  isPipelineBatchTerminal: mockIsPipelineBatchTerminal,
}))

import { getDashboardKpiMetrics } from '@lib/dashboardMetrics'
import { BATCHES_PATH, READY_FOR_LIBRARY_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'

describe('dashboardMetrics', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns the three live dashboard KPIs using the current route semantics', async () => {
    mockGetNeedsReviewDocumentsCount.mockResolvedValue(12)
    mockGetReadyForLibraryDocuments.mockResolvedValue({
      items: [],
      total: 4,
    })

    const activeBatch = { batchId: 'batch-active' }
    const failedBatch = { batchId: 'batch-failed' }
    const completedBatch = { batchId: 'batch-completed' }

    mockGetProcessBatchStatuses.mockResolvedValue([activeBatch, failedBatch, completedBatch])
    mockHasTerminalPipelineFailure.mockImplementation((batch: { batchId: string }) => batch.batchId === 'batch-failed')
    mockIsPipelineBatchTerminal.mockImplementation((batch: { batchId: string }) => batch.batchId !== 'batch-active')

    const metrics = await getDashboardKpiMetrics()

    expect(mockGetNeedsReviewDocumentsCount).toHaveBeenCalledWith()
    expect(mockGetReadyForLibraryDocuments).toHaveBeenCalledWith()
    expect(mockGetProcessBatchStatuses).toHaveBeenCalledWith(50)
    expect(metrics).toEqual([
      {
        title: 'Needs Review',
        value: 12,
        href: REVIEW_QUEUE_PATH,
      },
      {
        title: 'Ready for Library',
        value: 4,
        href: READY_FOR_LIBRARY_PATH,
      },
      {
        title: 'Active Batches',
        value: 1,
        href: BATCHES_PATH,
      },
    ])
  })
})
