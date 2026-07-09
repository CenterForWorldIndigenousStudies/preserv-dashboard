import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('material-react-table', () => ({
  useMaterialReactTable: (options: unknown) => options,
  MaterialReactTable: ({
    table,
  }: {
    table: {
      columns: Array<{ Cell?: (args: unknown) => unknown }>
      data: Array<Record<string, unknown>>
    }
  }) => {
    const cell = table.columns[0]?.Cell
    const row = table.data[0]

    if (!cell || !row) {
      return <div>No rows</div>
    }

    const renderedCell = cell({ row: { original: row } }) as ReactNode

    return <div data-testid="version-document-link">{renderedCell}</div>
  },
}))

import { DocumentVersionsButton } from '@organisms/DocumentVersionsButton'

describe('DocumentVersionsButton', () => {
  it('preserves the current document detail context when opening a related version', () => {
    const markup = renderToStaticMarkup(
      <DocumentVersionsButton
        overviewHref="/documents/doc-1?from=%2Fcollections%3Fexpanded%3Dcollection-1"
        versionFamily={{
          version_group_id: 'vg-1',
          canonical_document_id: 'doc-1',
          documents: [
            {
              id: 'doc-2',
              name: 'Sibling version',
              id_legacy: 'legacy-2',
              filesize: 123,
              hash_binary: null,
              hash_content: null,
              source_id: null,
              created_at: null,
              updated_at: null,
              is_canonical: false,
              is_duplicate: false,
            },
          ],
        }}
      />,
    )

    expect(markup).toContain(
      '/documents/doc-2?from=%2Fdocuments%2Fdoc-1%3Ffrom%3D%252Fcollections%253Fexpanded%253Dcollection-1',
    )
  })
})
