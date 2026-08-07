import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { COLLECTIONS_PATH } from '@constants/paths'
import type { FilterOptions } from '@lib/search'

const { mockReplace, mockSearchParams } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockSearchParams: new URLSearchParams(
    'expanded=collection-1&collection-collection-1-page=2&collection-collection-1-pageSize=50&collection-collection-1-search=thesis',
  ),
}))

const mocks = vi.hoisted(() => ({
  collectionDocumentsTableProps: undefined as Record<string, unknown> | undefined,
}))

const filterOptions: FilterOptions = {
  collections: ['Collection One'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: ['APPROVED', 'NEEDS_REVIEW'],
}

vi.mock('next/navigation', () => ({
  usePathname: () => COLLECTIONS_PATH,
  useRouter: () => ({ replace: mockReplace, refresh: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@actions/collections', () => ({
  deleteCollectionAction: vi.fn(),
  getDocumentsForCollectionAction: vi.fn(),
}))

vi.mock('@organisms/CollectionDocumentsTable', () => ({
  CollectionDocumentsTable: (props: Record<string, unknown>) => {
    mocks.collectionDocumentsTableProps = props
    return <div data-testid="collection-documents-table">Collection documents table</div>
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
        filterOptions={filterOptions}
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

    expect(markup).toContain('Collection documents table')
    expect(mocks.collectionDocumentsTableProps).toMatchObject({
      collectionId: 'collection-1',
      documentCount: 1,
      originHref:
        '/collections?expanded=collection-1&collection-collection-1-page=2&collection-collection-1-pageSize=50&collection-collection-1-search=thesis&collection-collection-1-collection=Collection+One',
    })
  })
})
