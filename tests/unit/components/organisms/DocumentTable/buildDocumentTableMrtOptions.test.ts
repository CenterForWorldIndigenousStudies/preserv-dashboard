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
})
