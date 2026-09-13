import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { mockUseMaterialReactTable } = vi.hoisted(() => ({
  mockUseMaterialReactTable: vi.fn((options: unknown) => options),
}))

vi.mock('material-react-table', () => ({
  MaterialReactTable: () => null,
  useMaterialReactTable: mockUseMaterialReactTable,
}))

import { AuditHistoryTable } from '@organisms/AuditHistoryTable'
import type { AuditEntry } from 'types/documents'

const audit: AuditEntry = {
  document_id: 'document-1',
  field_name: 'dc_description',
  source_name: 'manual_edit',
  before_value: 'Before',
  after_value: 'After',
  changed_at: '2026-09-11T12:00:00.000Z',
}

describe('AuditHistoryTable', () => {
  it('keeps short values inline', () => {
    renderToStaticMarkup(<AuditHistoryTable audits={[audit]} />)

    const options = mockUseMaterialReactTable.mock.calls.at(-1)?.[0] as {
      columns: Array<{
        accessorKey?: string
        Cell?: (context: unknown) => React.ReactNode
      }>
    }

    const beforeColumn = options.columns.find((column) => column.accessorKey === 'before_value')
    const markup = renderToStaticMarkup(
      beforeColumn?.Cell?.({ renderedCellValue: audit.before_value }) as React.ReactElement,
    )

    expect(markup).toContain('Before')
    expect(markup).not.toContain('View before value')
  })

  it('moves long values into a view popover trigger', () => {
    const longValue = 'A'.repeat(81)

    renderToStaticMarkup(<AuditHistoryTable audits={[{ ...audit, before_value: longValue }]} />)

    const options = mockUseMaterialReactTable.mock.calls.at(-1)?.[0] as {
      columns: Array<{
        accessorKey?: string
        Cell?: (context: unknown) => React.ReactNode
      }>
    }

    const beforeColumn = options.columns.find((column) => column.accessorKey === 'before_value')
    const markup = renderToStaticMarkup(
      beforeColumn?.Cell?.({ renderedCellValue: longValue }) as React.ReactElement,
    )

    expect(markup).toContain('View before value')
    expect(markup).not.toContain(longValue)
  })

  it('moves multiline values into a view popover trigger', () => {
    const multilineValue = 'First line\nSecond line'

    renderToStaticMarkup(<AuditHistoryTable audits={[{ ...audit, after_value: multilineValue }]} />)

    const options = mockUseMaterialReactTable.mock.calls.at(-1)?.[0] as {
      columns: Array<{
        accessorKey?: string
        Cell?: (context: unknown) => React.ReactNode
      }>
    }

    const afterColumn = options.columns.find((column) => column.accessorKey === 'after_value')
    const markup = renderToStaticMarkup(
      afterColumn?.Cell?.({ renderedCellValue: multilineValue }) as React.ReactElement,
    )

    expect(markup).toContain('View after value')
    expect(markup).not.toContain('First line')
  })
})
