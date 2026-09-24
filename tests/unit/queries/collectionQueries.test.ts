import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb, mockCreateEditHistoryEntry, mockMarkDocumentBatchesPublicationLocked } = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
    collections: { findUnique: vi.fn() },
    documents: { findMany: vi.fn() },
    document_to_tags: { findMany: vi.fn() },
  },
  mockCreateEditHistoryEntry: vi.fn(),
  mockMarkDocumentBatchesPublicationLocked: vi.fn(),
}))

vi.mock('@lib/db', () => ({ db: mockDb }))
vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: mockCreateEditHistoryEntry,
  markDocumentBatchesPublicationLocked: mockMarkDocumentBatchesPublicationLocked,
}))

import {
  addDocumentsToCollection,
  removeDocumentsFromCollection,
  updateDocumentCollectionTags,
} from '@lib/queries/collectionQueries'

describe('updateDocumentCollectionTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateEditHistoryEntry.mockResolvedValue(undefined)
    mockMarkDocumentBatchesPublicationLocked.mockResolvedValue(undefined)
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
  })
})

describe('collection membership mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateEditHistoryEntry.mockResolvedValue(undefined)
    mockMarkDocumentBatchesPublicationLocked.mockResolvedValue(undefined)
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
