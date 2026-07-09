import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { mockReplace, mockSearchParams } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockSearchParams: new URLSearchParams(
    'expanded=collection-1&collection-collection-1-page=2&collection-collection-1-pageSize=50&collection-collection-1-search=thesis',
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/collections',
  useRouter: () => ({ replace: mockReplace, refresh: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@actions/collections', () => ({
  deleteCollectionAction: vi.fn(),
  getDocumentsForCollectionAction: vi.fn(),
}))

vi.mock('@organisms/document-table/DocumentDataTable', () => ({
  DocumentDataTable: ({ definition }: { definition: { columns: Array<{ Cell?: (args: unknown) => unknown }> } }) => {
    const cell = definition.columns[0]?.Cell

    if (!cell) {
      return <div>No cell</div>
    }

    const renderedCell = cell({
      row: {
        original: {
          id: 'doc-1',
          id_legacy: 'legacy-1',
          name: 'Sample document',
          source_id: 'source-1',
        },
      },
    }) as ReactNode

    return (
      <div data-testid="collection-document-link">
        {renderedCell}
      </div>
    )
  },
}))

vi.mock('@organisms/CollectionDocumentManager', () => ({
  CollectionDocumentManager: () => null,
}))

vi.mock('@organisms/TagDeleteFlowDialog', () => ({
  TagDeleteFlowDialog: () => null,
}))

import { CollectionsAccordion } from '@organisms/CollectionsAccordion'

describe('CollectionsAccordion', () => {
  it('links document detail back to the expanded collection state', () => {
    const markup = renderToStaticMarkup(
      <CollectionsAccordion
        collections={[
          {
            id: 'collection-1',
            tag_id: 'tag-1',
            collection_name: 'Collection One',
            created_at: null,
            updated_at: null,
            document_count: 1,
            notes: null,
          },
        ]}
      />,
    )

    expect(markup).toContain(
      '/documents/doc-1?from=%2Fcollections%3Fexpanded%3Dcollection-1%26collection-collection-1-page%3D2%26collection-collection-1-pageSize%3D50%26collection-collection-1-search%3Dthesis',
    )
  })
})
