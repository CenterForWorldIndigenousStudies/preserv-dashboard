import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockDb,
  mockCreateEditHistoryEntry,
  mockMarkDocumentBatchesPublicationLocked,
  mockRefreshDocumentReadiness,
  mockGetCollectionMemberDocumentCounts,
  mockGetCollectionMembershipIndex,
  mockGetOverviewDocumentsPage,
} = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    collections: { findMany: vi.fn(), findUnique: vi.fn() },
    documents: { findMany: vi.fn() },
    document_to_tags: { findMany: vi.fn() },
  },
  mockCreateEditHistoryEntry: vi.fn(),
  mockMarkDocumentBatchesPublicationLocked: vi.fn(),
  mockRefreshDocumentReadiness: vi.fn(),
  mockGetCollectionMemberDocumentCounts: vi.fn(),
  mockGetCollectionMembershipIndex: vi.fn(),
  mockGetOverviewDocumentsPage: vi.fn(),
}))

vi.mock('@lib/db', () => ({ db: mockDb }))
vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: mockCreateEditHistoryEntry,
  markDocumentBatchesPublicationLocked: mockMarkDocumentBatchesPublicationLocked,
}))
vi.mock('@lib/pipelineReadiness', () => ({
  refreshDocumentReadinessInTransaction: mockRefreshDocumentReadiness,
}))
vi.mock('@lib/queries/collectionMembershipQueries', () => ({
  getCollectionMemberDocumentCounts: mockGetCollectionMemberDocumentCounts,
  getCollectionMembershipIndex: mockGetCollectionMembershipIndex,
  getCollectionMemberDocumentIds: vi.fn(),
}))
vi.mock('@lib/queries/documentQuerySupport', async () => {
  const actual = await vi.importActual<typeof import('@lib/queries/documentQuerySupport')>('@lib/queries/documentQuerySupport')
  return { ...actual, getOverviewDocumentsPage: mockGetOverviewDocumentsPage }
})

import {
  addDocumentsToCollection,
  getCollectionPage,
  parseCollectionQueryParams,
  removeDocumentsFromCollection,
  updateDocumentCollectionTags,
} from '@lib/queries/collectionQueries'

const collectionRows = [
  {
    id: 'collection-food',
    tag_id: 'tag-food',
    tags: { id: 'tag-food', name: 'Food Sovereignty' },
    collection_qualifiers: [],
    fedora_node_id: '88',
    notes: null,
    created_at: null,
    updated_at: null,
  },
  {
    id: 'collection-climate',
    tag_id: 'tag-climate',
    tags: { id: 'tag-climate', name: 'Climate Change' },
    collection_qualifiers: [],
    fedora_node_id: '65',
    notes: null,
    created_at: null,
    updated_at: null,
  },
  {
    id: 'collection-empty',
    tag_id: 'tag-empty',
    tags: { id: 'tag-empty', name: 'Empty Collection' },
    collection_qualifiers: [],
    fedora_node_id: null,
    notes: null,
    created_at: null,
    updated_at: null,
  },
]

describe('updateDocumentCollectionTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateEditHistoryEntry.mockResolvedValue(undefined)
    mockMarkDocumentBatchesPublicationLocked.mockResolvedValue(undefined)
    mockRefreshDocumentReadiness.mockResolvedValue(undefined)
    mockGetCollectionMemberDocumentCounts.mockResolvedValue(
      new Map([
        ['collection-food', 3],
        ['collection-climate', 1],
        ['collection-empty', 0],
      ]),
    )
    mockGetCollectionMembershipIndex.mockResolvedValue({
      documentIdsByCollection: new Map([
        ['collection-food', ['document-food']],
        ['collection-climate', ['document-climate']],
        ['collection-empty', []],
      ]),
      counts: new Map([
        ['collection-food', 3],
        ['collection-climate', 1],
        ['collection-empty', 0],
      ]),
    })
    mockGetOverviewDocumentsPage.mockResolvedValue({
      data: [{ id: 'document-food' }],
      pageInfo: { pageSize: 2, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
    })
    mockDb.collections.findMany.mockResolvedValue(collectionRows)
  })

  it('normalizes collection table query parameters', () => {
    expect(
      parseCollectionQueryParams({
        search: '  Food  ',
        page: '2',
        pageSize: '50',
        orderBy: 'document_count',
        sortDirection: 'desc',
        cursorValue: '3',
        cursorId: 'collection-food',
        cursorDirection: 'next',
        contributor: ' Ada Lovelace ',
        statuses: 'VALIDATED,NEEDS_REVIEW',
        accessLevel: 'PUBLIC',
        documentType: 'duplicate',
        createdFrom: '2026-01-01',
        createdTo: '2026-01-31',
      }),
    ).toEqual({
      page: 2,
      pageSize: 50,
      search: 'Food',
      orderBy: 'document_count',
      sortDirection: 'desc',
      cursorValue: '3',
      cursorId: 'collection-food',
      cursorDirection: 'next',
      filters: {
        contributor: 'Ada Lovelace',
        statuses: ['VALIDATED', 'NEEDS_REVIEW'],
        accessLevel: 'public',
        documentType: 'duplicate',
        createdFrom: '2026-01-01',
        createdTo: '2026-01-31',
      },
    })
  })

  it('searches, sorts, paginates, and returns live collection counts', async () => {
    const result = await getCollectionPage({
      page: 1,
      pageSize: 25,
      orderBy: 'document_count',
      sortDirection: 'desc',
      filters: {},
    })

    expect(result.data.map((collection) => [collection.collection_name, collection.document_count])).toEqual([
      ['Food Sovereignty', 3],
      ['Climate Change', 1],
      ['Empty Collection', 0],
    ])
    expect(result.totalCount).toBe(3)
    expect(result.pageInfo).toMatchObject({ pageSize: 25, hasPreviousPage: false, hasNextPage: false })

    const searchResult = await getCollectionPage({ page: 1, pageSize: 25, search: '  FOOD ', filters: {} })
    expect(searchResult.data.map((collection) => collection.id)).toEqual(['collection-food'])
  })

  it('applies advanced document filters with one shared query across live collection members', async () => {
    mockGetCollectionMembershipIndex.mockResolvedValueOnce({
      documentIdsByCollection: new Map([['collection-food', ['document-food']]]),
      counts: new Map([['collection-food', 3]]),
    })

    const result = await getCollectionPage({
      page: 1,
      pageSize: 25,
      filters: { collection: 'Food Sovereignty' },
    })

    expect(mockGetCollectionMembershipIndex).toHaveBeenCalledWith(mockDb, {
      collectionIds: ['collection-food'],
    })
    expect(mockGetOverviewDocumentsPage).toHaveBeenCalledOnce()
    expect(mockGetOverviewDocumentsPage).toHaveBeenCalledWith(
      expect.objectContaining({ documentIds: ['document-food'] }),
      mockDb,
    )
    expect(result.data.map((collection) => collection.id)).toEqual(['collection-food'])
  })

  it('reports an empty page with a previous page when the requested page is past the results', async () => {
    const result = await getCollectionPage({ page: 2, pageSize: 25, filters: {} })

    expect(result.data).toEqual([])
    expect(result.pageInfo).toMatchObject({ pageSize: 25, hasPreviousPage: true, hasNextPage: false })
  })

  it('synchronizes collection associations without removing ordinary document tags', async () => {
    const tx = {
      documents: {
        findUnique: vi.fn().mockResolvedValue({ id: 'doc-1' }),
      },
      collections: {
        findMany: vi.fn().mockResolvedValue([
          { tag_id: 'collection-tag-a', tags: { name: 'Collection A' } },
          { tag_id: 'collection-tag-b', tags: { name: 'Collection B' } },
        ]),
      },
      document_to_tags: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'document-tag-a',
            document_id: 'doc-1',
            tag_id: 'collection-tag-a',
            notes: null,
            created_at: null,
            tags: { id: 'collection-tag-a', name: 'Collection A', notes: null },
            documents: { id: 'doc-1', name: 'Document One' },
          },
        ]),
        delete: vi.fn(),
        create: vi.fn().mockResolvedValue({
          id: 'document-tag-b',
          document_id: 'doc-1',
          tag_id: 'collection-tag-b',
          notes: null,
          created_at: null,
        }),
      },
    }
    mockDb.$transaction.mockImplementationOnce(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    )

    await expect(updateDocumentCollectionTags('doc-1', ['Collection B'])).resolves.toBe(true)

    expect(tx.document_to_tags.findMany).toHaveBeenCalledWith({
      where: {
        document_id: 'doc-1',
        tag_id: { in: ['collection-tag-a', 'collection-tag-b'] },
      },
      include: { documents: { select: { name: true } }, tags: true },
    })
    expect(tx.document_to_tags.delete).toHaveBeenCalledWith({ where: { id: 'document-tag-a' } })
    expect(tx.document_to_tags.create).toHaveBeenCalledWith({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        document_id: 'doc-1',
        tag_id: 'collection-tag-b',
      },
      include: { documents: { select: { name: true } }, tags: true },
    })
    expect(mockMarkDocumentBatchesPublicationLocked).toHaveBeenCalledWith(tx, 'doc-1')
    expect(mockRefreshDocumentReadiness).toHaveBeenCalledWith(tx, ['doc-1'])
  })
})

describe('collection membership mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateEditHistoryEntry.mockResolvedValue(undefined)
    mockMarkDocumentBatchesPublicationLocked.mockResolvedValue(undefined)
    mockRefreshDocumentReadiness.mockResolvedValue(undefined)
  })

  it('rolls back added memberships when audit history fails', async () => {
    const state = { associationIds: [] as string[] }
    const collection = {
      id: 'collection-1',
      tag_id: 'collection-tag-1',
      tags: { id: 'collection-tag-1', name: 'Collection A' },
    }
    const tx = {
      collections: {
        findUnique: vi.fn().mockResolvedValue(collection),
      },
      documents: {
        findMany: vi.fn().mockResolvedValue([{ id: 'doc-1', name: 'Document One' }]),
      },
      document_to_tags: {
        upsert: vi.fn().mockImplementation(({ create }: { create: { id: string; document_id: string } }) => {
          state.associationIds.push(create.id)
          return { id: create.id, document_id: create.document_id, created_at: null }
        }),
      },
    }
    mockDb.collections.findUnique.mockResolvedValue(collection)
    mockDb.documents.findMany.mockResolvedValue([{ id: 'doc-1', name: 'Document One' }])
    mockDb.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => {
      const previousAssociationIds = [...state.associationIds]
      try {
        return await callback(tx)
      } catch (error) {
        state.associationIds = previousAssociationIds
        throw error
      }
    })
    mockCreateEditHistoryEntry.mockRejectedValue(new Error('audit unavailable'))

    await expect(addDocumentsToCollection('collection-1', ['doc-1'])).rejects.toThrow('audit unavailable')

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    expect(mockDb.collections.findUnique).not.toHaveBeenCalled()
    expect(mockDb.documents.findMany).not.toHaveBeenCalled()
    expect(state.associationIds).toEqual([])
  })

  it('loads removal audit data inside the transaction', async () => {
    const association = {
      id: 'document-tag-1',
      document_id: 'doc-1',
      tag_id: 'collection-tag-1',
      notes: null,
      created_at: null,
      tags: { id: 'collection-tag-1', name: 'Collection A' },
      documents: { name: 'Document One' },
    }
    const tx = {
      collections: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'collection-1',
          tag_id: 'collection-tag-1',
          tags: { id: 'collection-tag-1', name: 'Collection A' },
        }),
      },
      document_to_tags: {
        findMany: vi.fn().mockResolvedValue([association]),
        deleteMany: vi.fn(),
      },
    }
    mockDb.collections.findUnique.mockResolvedValue({
      id: 'collection-1',
      tag_id: 'collection-tag-1',
      tags: { id: 'collection-tag-1', name: 'Collection A' },
    })
    mockDb.document_to_tags.findMany.mockResolvedValue([association])
    mockDb.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))

    await removeDocumentsFromCollection('collection-1', ['doc-1'])

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    expect(mockDb.collections.findUnique).not.toHaveBeenCalled()
    expect(mockDb.document_to_tags.findMany).not.toHaveBeenCalled()
    expect(tx.collections.findUnique).toHaveBeenCalledWith({
      where: { id: 'collection-1' },
      include: { tags: true },
    })
    expect(tx.document_to_tags.findMany).toHaveBeenCalledWith({
      where: {
        document_id: { in: ['doc-1'] },
        tag_id: 'collection-tag-1',
      },
      include: { documents: { select: { name: true } }, tags: true },
    })
  })
})
