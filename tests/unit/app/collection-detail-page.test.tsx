import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { CollectionWithMeta } from 'types/collections'
import type { FilterOptions } from '@lib/search'

const targetedCollection: CollectionWithMeta = {
  id: 'collection-1',
  tag_id: 'tag-1',
  collection_name: 'Collection One',
  created_at: null,
  updated_at: null,
  document_count: 1,
  notes: null,
}

const filterOptions: FilterOptions = { collections: ['Collection One'], accessLevels: [], statuses: [] }

const { mockGetCollections, mockGetDocumentFilterOptions, mockNotFound, mockCollectionsPageClient } = vi.hoisted(() => ({
  mockGetCollections: vi.fn(),
  mockGetDocumentFilterOptions: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error('not found')
  }),
  mockCollectionsPageClient: vi.fn(() => <div>{'Collection detail'}</div>),
}))

vi.mock('next/navigation', () => ({ notFound: mockNotFound }))

vi.mock('@lib/queries/collectionQueries', () => ({ getCollections: mockGetCollections }))

vi.mock('@lib/queries/queries', () => ({ getDocumentFilterOptions: mockGetDocumentFilterOptions }))

vi.mock('@organisms/CollectionsPageClient', () => ({ CollectionsPageClient: mockCollectionsPageClient }))

import CollectionDetailPage from '@root/app/collections/[id]/page'

describe('CollectionDetailPage', () => {
  it('renders only the requested collection', async () => {
    mockGetCollections.mockResolvedValue([
      targetedCollection,
      { ...targetedCollection, id: 'collection-2', collection_name: 'Collection Two' },
    ])
    mockGetDocumentFilterOptions.mockResolvedValue(filterOptions)

    const markup = renderToStaticMarkup(
      await CollectionDetailPage({
        params: Promise.resolve({ id: 'collection-1' }),
        searchParams: Promise.resolve({ from: '/documents/doc-1', fromLabel: 'My Document' }),
      }),
    )

    expect(markup).toContain('Collection detail')
    expect(mockCollectionsPageClient).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: targetedCollection,
        filterOptions,
        returnHref: '/documents/doc-1',
        returnLocation: 'My Document',
      }),
      undefined,
    )
  })

  it('returns not found for an unknown collection', async () => {
    mockGetCollections.mockResolvedValue([])
    mockGetDocumentFilterOptions.mockResolvedValue(filterOptions)

    await expect(
      CollectionDetailPage({
        params: Promise.resolve({ id: 'missing' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('not found')
    expect(mockNotFound).toHaveBeenCalledTimes(1)
  })
})
