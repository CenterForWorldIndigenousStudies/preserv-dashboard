import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { BatchSummaryTable, getInitialExpandedBatchState } from '@organisms/BatchSummaryTable'
import type { BatchSummary } from 'types/batches'

const rows: BatchSummary[] = [
  {
    batch_id: 'batch-1',
    batch_name: 'Batch One',
    started_at: '2026-07-09T00:00:00.000Z',
    property_key: 'total_documents',
    property_value: 4,
  },
]

describe('BatchSummaryTable', () => {
  it('expands only a matching requested batch', () => {
    expect(getInitialExpandedBatchState(['batch-1', 'batch-2'], 'batch-2')).toEqual({ 'batch-2': true })
    expect(getInitialExpandedBatchState(['batch-1', 'batch-2'], undefined)).toEqual({})
    expect(getInitialExpandedBatchState(['batch-1', 'batch-2'], 'missing')).toEqual({})
  })

  it('frames table expansion as the primary batch drill-in path', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <BatchSummaryTable data={rows} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Primary batch drill-in starts here.')
    expect(markup).toContain('Expand a batch row to inspect the current repository-backed processing details for that run.')
    expect(markup).toContain('Batch ID: batch-1')
    expect(markup).toContain('Inspection')
  })

  it('shows a clear message when a requested batch is not present', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <BatchSummaryTable
          data={rows}
          initialExpandedBatchId="missing-batch"
          requestedBatchFound={false}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Batch “missing-batch” was not found.')
  })
})
