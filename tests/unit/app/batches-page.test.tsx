import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetBatchSummary } = vi.hoisted(() => ({
  mockGetBatchSummary: vi.fn(),
}))

vi.mock('@lib/queries', () => ({
  getBatchSummary: mockGetBatchSummary,
}))

vi.mock('@organisms/BatchSummaryTable', () => ({
  BatchSummaryTable: () => <div>Batch summary table stub</div>,
}))

import BatchSummaryPage from '@root/app/batches/page'

describe('BatchSummaryPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('frames Batches as monitoring and links back to Process', () => {
    mockGetBatchSummary.mockResolvedValue([
      {
        batch_id: 'batch-1',
        batch_name: 'Batch One',
        started_at: '2026-07-09T00:00:00.000Z',
        property_key: 'total_documents',
        property_value: 5,
      },
    ])

    const markup = renderToStaticMarkup(BatchSummaryPage())

    expect(markup).toContain('Monitor batch health and investigate batch history.')
    expect(markup).toContain('Batches owns monitoring and investigation.')
    expect(markup).toContain('Back to Process')
    expect(markup).toContain('/process-documents')
  })
})
