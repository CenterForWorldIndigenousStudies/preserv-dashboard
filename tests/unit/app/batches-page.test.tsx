import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetBatchSummary, mocks } = vi.hoisted(() => ({
  mockGetBatchSummary: vi.fn(),
  mocks: { batchSummaryTableProps: undefined as Record<string, unknown> | undefined },
}))

vi.mock('@lib/queries', () => ({
  getBatchSummary: mockGetBatchSummary,
}))

vi.mock('@organisms/BatchSummaryTable', () => ({
  BatchSummaryTable: (props: Record<string, unknown>) => {
    mocks.batchSummaryTableProps = props
    return <div>Batch summary table stub</div>
  },
}))

import BatchSummaryPage from '@root/app/batches/page'

describe('BatchSummaryPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mocks.batchSummaryTableProps = undefined
  })

  it('frames Batches as monitoring and links back to Process', async () => {
    mockGetBatchSummary.mockResolvedValue([
      {
        batch_id: 'batch-1',
        batch_name: 'Batch One',
        started_at: '2026-07-09T00:00:00.000Z',
        property_key: 'total_documents',
        property_value: 5,
      },
    ])

    const markup = renderToStaticMarkup(await BatchSummaryPage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Monitor batch health and investigate batch history.')
    expect(markup).toContain('Batches owns monitoring and investigation.')
    expect(markup).toContain('Back to Process')
    expect(markup).toContain('/process-documents')
  })

  it('passes a requested batch ID through for focused expansion', async () => {
    mockGetBatchSummary.mockResolvedValue([
      {
        batch_id: 'batch-1',
        batch_name: 'Batch One',
        started_at: '2026-07-09T00:00:00.000Z',
        property_key: 'total_documents',
        property_value: 5,
      },
    ])

    renderToStaticMarkup(
      await BatchSummaryPage({ searchParams: Promise.resolve({ batchId: 'batch-1' }) }),
    )

    expect(mocks.batchSummaryTableProps).toMatchObject({
      initialExpandedBatchId: 'batch-1',
      requestedBatchFound: true,
    })
  })

  it('reports an unknown requested batch without changing the default table behavior', async () => {
    mockGetBatchSummary.mockResolvedValue([
      {
        batch_id: 'batch-1',
        batch_name: 'Batch One',
        started_at: '2026-07-09T00:00:00.000Z',
        property_key: 'total_documents',
        property_value: 5,
      },
    ])

    renderToStaticMarkup(await BatchSummaryPage({ searchParams: Promise.resolve({ batchId: 'missing-batch' }) }))

    expect(mocks.batchSummaryTableProps).toMatchObject({
      initialExpandedBatchId: 'missing-batch',
      requestedBatchFound: false,
    })
  })
})
