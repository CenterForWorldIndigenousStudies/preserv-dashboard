import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { mockUseMaterialReactTable } = vi.hoisted(() => ({
  mockUseMaterialReactTable: vi.fn((options: unknown) => options),
}))

vi.mock('material-react-table', () => ({
  MaterialReactTable: () => null,
  useMaterialReactTable: mockUseMaterialReactTable,
}))

import { StateHistoryTable } from '@organisms/StateHistoryTable'
import type { StateHistoryEntry } from 'types/documents'
import type { NeedsReviewReasonGroup } from 'types/needsReview'

const state: StateHistoryEntry = {
  id: 'state-1',
  document_id: 'document-1',
  previous_state: 'ingested',
  new_state: 'normalized',
  changed_at: '2026-09-11T12:00:00.000Z',
}

describe('StateHistoryTable', () => {
  it('renders state transitions with badges and a formatted changed date', () => {
    renderToStaticMarkup(<StateHistoryTable states={[state]} documentId={'document-1'} />)

    const options = mockUseMaterialReactTable.mock.calls.at(-1)?.[0] as {
      columns: Array<{
        accessorKey?: string
        Cell?: (context: unknown) => React.ReactNode
      }>
      data: StateHistoryEntry[]
      emptyMessage: string
    }

    expect(options.data).toEqual([state])
    expect(options.columns.map((column) => column.accessorKey)).toEqual([
      'previous_state',
      'new_state',
      'changed_at',
    ])

    const previousStateMarkup = renderToStaticMarkup(
      options.columns[0]?.Cell?.({ row: { original: state } }) as React.ReactElement,
    )
    const changedAtMarkup = renderToStaticMarkup(
      options.columns[2]?.Cell?.({ row: { original: state } }) as React.ReactElement,
    )

    expect(previousStateMarkup).toContain('Ingested')
    expect(changedAtMarkup).toContain('2026-09-11 12:00 UTC')
  })

  it('uses the needs-review popover with a humanized status trigger', () => {
    const needsReviewState: StateHistoryEntry = {
      ...state,
      new_state: 'needs_review',
    }
    const needsReviewReasons: NeedsReviewReasonGroup[] = [
      {
        serviceKey: 'ocr_processor',
        serviceLabel: 'OCR Processor',
        reasons: ['OCR confidence is too low.'],
      },
    ]

    renderToStaticMarkup(
      <StateHistoryTable
        documentId={'document-1'}
        needsReviewReasons={needsReviewReasons}
        states={[needsReviewState]}
      />,
    )

    const options = mockUseMaterialReactTable.mock.calls.at(-1)?.[0] as {
      columns: Array<{
        accessorKey?: string
        Cell?: (context: unknown) => React.ReactNode
      }>
    }
    const newStateMarkup = renderToStaticMarkup(
      options.columns[1]?.Cell?.({ row: { original: needsReviewState } }) as React.ReactElement,
    )

    expect(newStateMarkup).toContain('Needs Review')
    expect(newStateMarkup).toContain('View 1 needs review reason for document document-1')
  })
})
