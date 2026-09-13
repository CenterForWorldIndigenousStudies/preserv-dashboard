import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { mockUseMaterialReactTable } = vi.hoisted(() => ({
  mockUseMaterialReactTable: vi.fn((options: unknown) => options),
}))

vi.mock('material-react-table', () => ({
  MaterialReactTable: () => null,
  useMaterialReactTable: mockUseMaterialReactTable,
}))

import { DocumentBatchAssociations } from '@organisms/DocumentBatchAssociations'
import type { DocumentToBatch } from 'types/documents'

const association: DocumentToBatch = {
  id: 'link-1',
  document_id: 'document-1',
  batch_id: 'batch-1',
  added_at: '2026-06-03T08:00:00Z',
  batch_started_at: '2026-06-03T09:00:00Z',
  batch_document_count: 7,
  batch_origin: 'Drive ingest folder A',
  cost: '0.12',
  processing_time_seconds: 42,
  ocr_quality_low: false,
  ocr_quality_medium: true,
  batch_legacy_id: 'legacy-batch-1',
  batch_name: 'June 3 Ingest',
  batch_status: 'complete',
}

describe('DocumentBatchAssociations', () => {
  it('uses sortable columns and renders a batch-style identity link back to the document', () => {
    renderToStaticMarkup(
      <DocumentBatchAssociations
        batchAssociations={[association]}
        batchReturnHref={'/documents/document-1'}
        batchReturnLabel={'document Document One'}
      />,
    )

    const options = mockUseMaterialReactTable.mock.calls.at(-1)?.[0] as {
      enableSorting?: boolean
      columns: Array<{
        id?: string
        accessorKey?: string
        accessorFn?: (row: DocumentToBatch) => unknown
        Cell?: (context: unknown) => React.ReactNode
      }>
    }

    expect(options.enableSorting).toBe(true)
    expect(options.columns.map((column) => column.id ?? column.accessorKey)).toEqual([
      'batch',
      'batch_status',
      'batch_started_at',
      'documentCount',
      'cost',
      'processing_time_seconds',
    ])

    const batchCell = options.columns[0]?.Cell?.({ row: { original: association } })
    const batchMarkup = renderToStaticMarkup(batchCell as React.ReactElement)
    expect(batchMarkup).toContain('June 3 Ingest')
    expect(batchMarkup).toContain('legacy-batch-1')
    expect(batchMarkup).toContain(
      '/batches/batch-1?from=%2Fdocuments%2Fdocument-1&amp;fromLabel=document+Document+One',
    )

    const statusCell = options.columns[1]?.Cell?.({ row: { original: association } })
    const startedCell = options.columns[2]?.Cell?.({ row: { original: association } })
    const documentCountCell = options.columns[3]?.Cell?.({ row: { original: association } })
    const costCell = options.columns[4]?.Cell?.({ row: { original: association } })
    const processingTimeCell = options.columns[5]?.Cell?.({ row: { original: association } })

    expect(renderToStaticMarkup(statusCell as React.ReactElement)).toContain('Complete')
    expect(renderToStaticMarkup(startedCell as React.ReactElement)).toContain('2026-06-03 09:00 UTC')
    expect(options.columns[3]?.accessorFn?.(association)).toBe(7)
    expect(renderToStaticMarkup(documentCountCell as React.ReactElement)).toContain(
      '/documents?batch=June+3+Ingest&amp;from=%2Fdocuments%2Fdocument-1&amp;fromLabel=document+Document+One',
    )
    expect(renderToStaticMarkup(costCell as React.ReactElement)).toContain('$0.12')
    expect(renderToStaticMarkup(processingTimeCell as React.ReactElement)).toContain('42 seconds')
  })
})
