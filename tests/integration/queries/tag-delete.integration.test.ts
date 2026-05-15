import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { db } from '@lib/db'

import { deleteCollectionWithOptionsInTransaction, deleteTagInTransaction } from '@lib/queries'
vi.mock('../../../auth', () => ({
  auth: () => Promise.resolve({ user: { email: 'test@example.com' } }),
  getDashboardSession: () => Promise.resolve({ user: { email: 'test@example.com' } }),
}))

import { resetTestDatabase } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

describe('deleteTag (integration)', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('deletes the tag and all document_to_tags rows when cascade is requested', async () => {
    await withRollbackTransaction(async (tx) => {
      const tag = await tx.tags.create({
        data: {
          id: 'tag-delete-cascade-0000000000000001',
          name: 'Tag Delete Cascade',
        },
      })
      const docOne = await tx.documents.create({
        data: {
          id: 'tag-delete-doc-000000000000000001',
          id_legacy: 'tag-delete-doc-legacy-1',
          name: 'Tag Delete Doc 1',
          hash_binary: 'hash-delete-1',
          hash_content: 'content-delete-1',
          filesize: BigInt(1),
        },
      })
      const docTwo = await tx.documents.create({
        data: {
          id: 'tag-delete-doc-000000000000000002',
          id_legacy: 'tag-delete-doc-legacy-2',
          name: 'Tag Delete Doc 2',
          hash_binary: 'hash-delete-2',
          hash_content: 'content-delete-2',
          filesize: BigInt(2),
        },
      })

      await tx.document_to_tags.createMany({
        data: [
          {
            id: 'tag-delete-link-0000000000000001',
            document_id: docOne.id,
            tag_id: tag.id,
          },
          {
            id: 'tag-delete-link-0000000000000002',
            document_id: docTwo.id,
            tag_id: tag.id,
          },
        ],
      })

      await deleteTagInTransaction(tx, tag.id, true)

      const remainingTag = await tx.tags.findUnique({ where: { id: tag.id } })
      const remainingLinks = await tx.document_to_tags.findMany({ where: { tag_id: tag.id } })
      const historyRows = await tx.edit_history.findMany({
        where: {
          OR: [
            { entity_table: 'tags', entity_id: tag.id },
            { entity_table: 'document_to_tags', entity_id: 'tag-delete-link-0000000000000001' },
            { entity_table: 'document_to_tags', entity_id: 'tag-delete-link-0000000000000002' },
          ],
        },
        orderBy: { edited_at: 'asc' },
      })

      expect(remainingTag).toBeNull()
      expect(remainingLinks).toHaveLength(0)
      expect(historyRows).toHaveLength(3)
      expect(historyRows.map((row) => row.entity_table).sort()).toEqual([
        'document_to_tags',
        'document_to_tags',
        'tags',
      ])
      const tagHistoryRow = historyRows.find((row) => row.entity_table === 'tags')
      expect(tagHistoryRow?.edit_summary).toContain('Deleted tag')
    })
  })

  it('deletes the collection, tag, and document links when collection deletion cascades', async () => {
    await withRollbackTransaction(async (tx) => {
      const tag = await tx.tags.create({
        data: {
          id: 'tag-delete-cascade-0000000000000003',
          name: 'Collection Cascade Tag',
        },
      })
      const collection = await tx.collections.create({
        data: {
          id: 'collection-delete-cascade-00000001',
          tag_id: tag.id,
          notes: 'collection notes',
        },
      })
      const doc = await tx.documents.create({
        data: {
          id: 'tag-delete-doc-000000000000000003',
          id_legacy: 'tag-delete-doc-legacy-3',
          name: 'Tag Delete Doc 3',
          hash_binary: 'hash-delete-3',
          hash_content: 'content-delete-3',
          filesize: BigInt(3),
        },
      })
      await tx.document_to_tags.create({
        data: {
          id: 'tag-delete-link-0000000000000003',
          document_id: doc.id,
          tag_id: tag.id,
        },
      })

      await deleteCollectionWithOptionsInTransaction(tx, collection.id, { deleteTagFromSystem: true })

      const remainingCollection = await tx.collections.findUnique({ where: { id: collection.id } })
      const remainingTag = await tx.tags.findUnique({ where: { id: tag.id } })
      const remainingLinks = await tx.document_to_tags.findMany({ where: { tag_id: tag.id } })
      const historyRows = await tx.edit_history.findMany({
        where: {
          OR: [
            { entity_table: 'collections', entity_id: collection.id },
            { entity_table: 'tags', entity_id: tag.id },
            { entity_table: 'document_to_tags', entity_id: 'tag-delete-link-0000000000000003' },
          ],
        },
        orderBy: { edited_at: 'asc' },
      })

      expect(remainingCollection).toBeNull()
      expect(remainingTag).toBeNull()
      expect(remainingLinks).toHaveLength(0)
      expect(historyRows.map((row) => row.entity_table).sort()).toEqual([
        'collections',
        'document_to_tags',
        'tags',
      ])
    })
  })
})
