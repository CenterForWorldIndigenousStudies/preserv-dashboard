import { describe, expect, it } from 'vitest'

import { buildDocumentTableMrtOptions } from '@organisms/DocumentTable/buildDocumentTableMrtOptions'
import dashboardTheme from '@components/theme'

describe('buildDocumentTableMrtOptions', () => {
  it('does not render MRT toolbars or the unused grouping drop zone', () => {
    const options = buildDocumentTableMrtOptions({
      columns: [],
      data: [],
      emptyMessage: 'No documents found.',
    })

    expect(options.enableTopToolbar).toBe(false)
    expect(options.enableBottomToolbar).toBe(false)
    expect(options.positionToolbarDropZone).toBe('none')
  })

  it('uses the white panel surface for the table shell', () => {
    const options = buildDocumentTableMrtOptions({
      columns: [],
      data: [],
      emptyMessage: 'No documents found.',
    })

    expect(options.muiTablePaperProps).toEqual({
      sx: { backgroundColor: 'background.paper' },
    })
    const containerProps = options.muiTableContainerProps as {
      sx: (theme: typeof dashboardTheme) => Record<string, unknown>
    }

    expect(containerProps.sx(dashboardTheme)).toMatchObject({
      backgroundColor: 'background.paper',
    })
  })

  it('passes per-row styling to the body row and selection checkbox', () => {
    const options = buildDocumentTableMrtOptions({
      columns: [],
      data: [],
      emptyMessage: 'No documents found.',
      getRowProps: (row: { id: string }) => ({ sx: { color: row.id } }),
      getSelectCheckboxProps: (row: { id: string }) => ({ sx: { color: row.id } }),
    })

    const rowProps = options.muiTableBodyRowProps as (props: { row: { original: { id: string } } }) => Record<string, unknown>
    const checkboxProps = options.muiSelectCheckboxProps as (props: {
      row: { original: { id: string } }
    }) => Record<string, unknown>

    expect(rowProps({ row: { original: { id: 'draft-1' } } })).toEqual({ sx: { color: 'draft-1' } })
    expect(checkboxProps({ row: { original: { id: 'draft-1' } } })).toEqual({ sx: { color: 'draft-1' } })
  })
})
