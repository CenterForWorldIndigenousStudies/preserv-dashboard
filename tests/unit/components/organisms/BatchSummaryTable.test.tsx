import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { BatchSummaryTable } from '@organisms/BatchSummaryTable'
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
})
