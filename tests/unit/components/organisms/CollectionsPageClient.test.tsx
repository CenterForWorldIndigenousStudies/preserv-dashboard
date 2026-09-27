import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CollectionListPageResult, CollectionTableQuery, CollectionWithMeta } from 'types/collections'
import type { FilterOptions } from '@lib/search'

const collection: CollectionWithMeta = {
  id: 'collection-1',
  tag_id: 'tag-1',
  collection_name: 'Collection One',
  created_at: null,
  updated_at: null,
  document_count: 1,
  notes: null,
}

const filterOptions: FilterOptions = {
  collections: ['Collection One'],
  accessLevels: [],
  statuses: [],
}

const initialData: CollectionListPageResult = {
  data: [collection],
  totalCount: 1,
  pageInfo: {
    pageSize: 25,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
}

const initialQuery: CollectionTableQuery = { page: 1, pageSize: 25, filters: {} }

const { mockCollectionDetails, mockCollectionsTable } = vi.hoisted(() => ({
  mockCollectionDetails: vi.fn(() => <div>{'Collection detail'}</div>),
  mockCollectionsTable: vi.fn(() => <div>{'Collections table'}</div>),
}))

vi.mock('@organisms/CollectionDetails', () => ({
  CollectionDetails: mockCollectionDetails,
}))

vi.mock('@organisms/CollectionsTable', () => ({
  CollectionsTable: mockCollectionsTable,
}))

vi.mock('@organisms/AddCollectionDialog', () => ({
  AddCollectionDialog: () => null,
}))

import { CollectionsPageClient } from '@organisms/CollectionsPageClient'

describe('CollectionsPageClient', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the collection table for the collection index', () => {
    renderToStaticMarkup(
      <CollectionsPageClient
        filterOptions={filterOptions}
        initialData={initialData}
        initialQuery={initialQuery}
      />,
    )

    expect(mockCollectionsTable).toHaveBeenCalledWith(
      expect.objectContaining({ initialData, initialQuery, filterOptions }),
      undefined,
    )
    expect(mockCollectionDetails).not.toHaveBeenCalled()
  })

  it('renders only the targeted collection without accordion controls', () => {
    const markup = renderToStaticMarkup(
      <CollectionsPageClient
        collection={collection}
        filterOptions={filterOptions}
        returnHref={'/documents/doc-1'}
        returnLocation={'My Document'}
      />,
    )

    expect(markup).toContain('← Return to My Document')
    expect(markup).toContain('href="/documents/doc-1"')
    expect(markup).toContain('Collection Details')
    expect(mockCollectionDetails).toHaveBeenCalledWith(
      expect.objectContaining({ collection }),
      undefined,
    )
    expect(mockCollectionsTable).not.toHaveBeenCalled()
  })

  it('returns directly opened collection details to Collections by default', () => {
    const markup = renderToStaticMarkup(
      <CollectionsPageClient
        collection={collection}
        filterOptions={filterOptions}
      />,
    )

    expect(markup).toContain('← Return to Collections')
    expect(markup).toContain('href="/collections"')
  })
})
