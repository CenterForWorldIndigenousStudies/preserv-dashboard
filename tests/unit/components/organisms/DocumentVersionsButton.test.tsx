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

vi.mock('@mui/material/Dialog', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

import { DocumentVersionsButton } from '@organisms/DocumentVersionsButton'
import { DOCUMENTS_PATH } from '@constants/paths'

describe('DocumentVersionsButton', () => {
  it('preserves the current document detail context when opening a related version', () => {
    const markup = renderToStaticMarkup(
      <DocumentVersionsButton
        returnHref={`${DOCUMENTS_PATH}/doc-1?from=%2Fcollections%3Fexpanded%3Dcollection-1`}
        returnDocumentName="Original document"
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
              source_id: 'drive-file-123',
              created_at: null,
              updated_at: null,
              is_canonical: false,
              is_duplicate: false,
              is_preservation_candidate: true,
            },
          ],
        }}
      />,
    )

    expect(markup).toContain(
      `${DOCUMENTS_PATH}/doc-2?from=%2Fdocuments%2Fdoc-1%3Ffrom%3D%252Fcollections%253Fexpanded%253Dcollection-1`,
    )
    expect(markup).toContain('fromLabel=Document+Detail%3A+Original+document')
    expect(markup).toContain('Candidate')
    expect(markup).toContain('Source')
    expect(markup).toContain('drive-file-123')
  })
})
