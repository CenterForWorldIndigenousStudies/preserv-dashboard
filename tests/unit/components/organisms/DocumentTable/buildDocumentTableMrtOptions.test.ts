import { describe, expect, it } from 'vitest'

import { buildDocumentTableMrtOptions } from '@organisms/DocumentTable/buildDocumentTableMrtOptions'

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
})
