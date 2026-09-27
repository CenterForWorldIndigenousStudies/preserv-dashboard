import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { CollectionListPageResult, CollectionTableQuery } from 'types/collections'

const { mockGetCollectionPage, mockGetDocumentFilterOptions, mockParseCollectionQueryParams, mockCollectionsPageClient } =
  vi.hoisted(() => ({
    mockGetCollectionPage: vi.fn(),
    mockGetDocumentFilterOptions: vi.fn(),
    mockParseCollectionQueryParams: vi.fn(),
    mockCollectionsPageClient: vi.fn(() => <div>{'Collections table'}</div>),
  }))

vi.mock('@lib/queries/collectionQueries', () => ({
  getCollectionPage: mockGetCollectionPage,
  parseCollectionQueryParams: mockParseCollectionQueryParams,
}))

vi.mock('@lib/queries/queries', () => ({ getDocumentFilterOptions: mockGetDocumentFilterOptions }))

vi.mock('@organisms/CollectionsPageClient', () => ({ CollectionsPageClient: mockCollectionsPageClient }))

import CollectionsPage from '@root/app/collections/page'

const initialQuery: CollectionTableQuery = { page: 1, pageSize: 25, filters: {} }
const initialData: CollectionListPageResult = {
  data: [],
  totalCount: 0,
  pageInfo: {
    pageSize: 25,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
}

describe('CollectionsPage', () => {
  it('loads the normalized collection table query and initial data', async () => {
    mockParseCollectionQueryParams.mockReturnValue(initialQuery)
    mockGetCollectionPage.mockResolvedValue(initialData)
    mockGetDocumentFilterOptions.mockResolvedValue({ collections: [], accessLevels: [], statuses: [] })

    const markup = renderToStaticMarkup(await CollectionsPage({ searchParams: Promise.resolve({ search: 'Food' }) }))

    expect(markup).toContain('Collections table')
    expect(mockParseCollectionQueryParams).toHaveBeenCalledWith({ search: 'Food' })
    expect(mockGetCollectionPage).toHaveBeenCalledWith(initialQuery)
    expect(mockCollectionsPageClient).toHaveBeenCalledWith(
      expect.objectContaining({ initialData, initialQuery }),
      undefined,
    )
  })
})
