import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetBatchDetail, mockGetPipelineExecutionSnapshot, mockNotFound } = vi.hoisted(() => ({
  mockGetBatchDetail: vi.fn(),
  mockGetPipelineExecutionSnapshot: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('@lib/queries/reprocessingDraftQueries', () => ({
  getReprocessingDraft: vi.fn().mockResolvedValue(null),
}))

vi.mock('@lib/queries/batchQueries', () => ({
  getBatchDetail: mockGetBatchDetail,
}))

vi.mock('@lib/queries/pipelineExecutionQueries', () => ({
  getPipelineExecutionSnapshot: mockGetPipelineExecutionSnapshot,
}))

vi.mock('@organisms/ProcessBatchProgress', () => ({
  ProcessBatchProgress: ({
    processingDetails = [],
  }: {
    processingDetails?: readonly { key: string; value: unknown }[]
  }) => (
    <div>
      {'Pipeline progress stub'}
      {'Processing Details'}
      {processingDetails.map((property) => `${property.key}:${JSON.stringify(property.value)}`)}
    </div>
  ),
}))

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}))

import BatchDetailPage from '@root/app/batches/[batchId]/page'

const detail = {
  id: 'batch-1',
  name: 'Batch One',
  startedBy: 'mary@example.org',
  startedAt: '2026-07-09T00:00:00.000Z',
  properties: [
    { key: 'total_documents', value: 5 },
    { key: 'batch_statistics', value: { speed: 42, unit: 'documents/second' } },
    { key: 'Total Cost', value: '$12.50' },
    { key: 'Processing Time (seconds)', value: 42 },
  ],
}

describe('BatchDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the batch identity, processing properties, and return link', async () => {
    mockGetBatchDetail.mockResolvedValue(detail)
    mockGetPipelineExecutionSnapshot.mockResolvedValue({
      batch: { batchId: 'batch-1' },
      currentExecution: null,
      queueAttempts: [],
      batchNameConflict: false,
    })

    const markup = renderToStaticMarkup(
      await BatchDetailPage({
        params: Promise.resolve({ batchId: 'batch-1' }),
        searchParams: Promise.resolve({}),
      }),
    )

    expect(markup).toContain('Batch One')
    expect(markup).toContain('batch-1')
    expect(markup).toContain('Started At')
    expect(markup).toContain('Started By')
    expect(markup).toContain('mary@example.org')
    expect(markup).toContain('total_documents')
    expect(markup).toContain('documents/second')
    expect(markup).toContain('Pipeline progress stub')
    expect(markup.match(/Processing Details/g)).toHaveLength(1)
    expect(markup).toContain('Return to Batches')
    expect(mockGetBatchDetail).toHaveBeenCalledWith('batch-1')
    expect(mockGetPipelineExecutionSnapshot).toHaveBeenCalledWith('batch-1')
  })

  it('uses standard not-found behavior for an unknown batch', async () => {
    mockGetBatchDetail.mockResolvedValue(null)
    mockGetPipelineExecutionSnapshot.mockResolvedValue({
      batch: null,
      currentExecution: null,
      queueAttempts: [],
      batchNameConflict: false,
    })

    await expect(
      BatchDetailPage({
        params: Promise.resolve({ batchId: 'missing-batch' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalledOnce()
  })

  it('omits Started By when the batch has no starter', async () => {
    mockGetBatchDetail.mockResolvedValue({ ...detail, startedBy: null })
    mockGetPipelineExecutionSnapshot.mockResolvedValue({
      batch: null,
      currentExecution: null,
      queueAttempts: [],
      batchNameConflict: false,
    })

    const markup = renderToStaticMarkup(
      await BatchDetailPage({
        params: Promise.resolve({ batchId: 'batch-1' }),
        searchParams: Promise.resolve({}),
      }),
    )

    expect(markup).not.toContain('Started By')
  })
})
