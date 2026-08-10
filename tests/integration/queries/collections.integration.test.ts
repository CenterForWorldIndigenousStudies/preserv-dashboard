import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { db } from '@lib/db'

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import {
  getCollections,
  getCollectionDocuments,
  getDocumentsForCollection,
  getDocumentsNotInCollection,
  getDocumentFilterOptions,
} from '@lib/queries/queries'
import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('collection queries (integration)', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  describe('getCollections', () => {
    it('returns collections with document counts', async () => {
      await withRollbackTransaction(async () => {
        const collections = await getCollections()
        expect(Array.isArray(collections)).toBe(true)
        for (const col of collections) {
          expect(typeof col.id).toBe('string')
          expect(typeof col.collection_name).toBe('string')
          expect(typeof col.document_count).toBe('number')
        }
      })
    })

    it('returns overview collection filter options from collections, not arbitrary tags', async () => {
      await withRollbackTransaction(async (tx) => {
        const strayTag = await tx.tags.create({
          data: {
            id: 'overview-filter-stray-tag-0000001',
            name: 'Not A Collection Tag',
          },
        })
        const document = await tx.documents.create({
          data: {
            id: 'overview-filter-doc-0000000000001',
            id_legacy: 'overview-filter-doc-legacy-1',
            name: 'Overview Filter Document',
            hash_binary: 'overview-filter-hash-1',
            hash_content: 'overview-filter-content-1',
            filesize: BigInt(1),
          },
        })
        await tx.document_to_tags.create({
          data: {
            id: 'overview-filter-link-0000000000001',
            document_id: document.id,
            tag_id: strayTag.id,
          },
        })

        const filterOptions = await getDocumentFilterOptions()
        expect(filterOptions.collections).not.toContain('Not A Collection Tag')
      })
    })
  })

  describe('getDocumentsForCollection', () => {
    it('returns documents for a real collection id', async () => {
      await withRollbackTransaction(async () => {
        const collections = await getCollections()
        expect(collections.length).toBeGreaterThan(0)

        const { documents } = await getDocumentsForCollection(collections[0].id)
        expect(Array.isArray(documents)).toBe(true)
      })
    })

    it('returns an empty array for a non-existent collection id', async () => {
      await withRollbackTransaction(async () => {
        const { documents } = await getDocumentsForCollection('00000000-0000-0000-0000-000000000000')
        expect(documents).toEqual([])
      })
    })

    it('fuzzy-matches Batch names without escaping the collection scope', async () => {
      await withRollbackTransaction(async (tx) => {
        const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
        const collectionTag = await tx.tags.create({
          data: { id: `ct${token}`, name: `Batch Search Collection ${token}` },
          select: { id: true },
        })
        const collection = await tx.collections.create({
          data: { id: `cc${token}`, tag_id: collectionTag.id },
          select: { id: true },
        })
        const matchingDocument = await tx.documents.create({
          data: {
            id: `cd${token}match`,
            id_legacy: `cl${token}match`,
            name: 'Collection Batch Match',
            hash_binary: `cb${token}match`,
            hash_content: `cc${token}match`,
            filesize: BigInt(1),
          },
          select: { id: true },
        })
        const nonMatchingDocument = await tx.documents.create({
          data: {
            id: `cd${token}other`,
            id_legacy: `cl${token}other`,
            name: 'Collection Batch Other',
            hash_binary: `cb${token}other`,
            hash_content: `cc${token}other`,
            filesize: BigInt(1),
          },
          select: { id: true },
        })
        const matchingBatch = await tx.batches.create({
          data: {
            id: `cba${token}match`,
            name: 'Collection Special RCR Writings September 25 2025',
            processing_details: JSON.stringify({}),
          },
          select: { id: true },
        })
        const otherBatch = await tx.batches.create({
          data: {
            id: `cba${token}other`,
            name: 'Collection Other Batch',
            processing_details: JSON.stringify({}),
          },
          select: { id: true },
        })

        await tx.document_to_tags.createMany({
          data: [
            { id: `cdt${token}match`, document_id: matchingDocument.id, tag_id: collectionTag.id },
            { id: `cdt${token}other`, document_id: nonMatchingDocument.id, tag_id: collectionTag.id },
          ],
        })
        await tx.document_to_batches.createMany({
          data: [
            {
              id: `cdb${token}match`,
              document_id: matchingDocument.id,
              batch_id: matchingBatch.id,
              processing_details: JSON.stringify({}),
            },
            {
              id: `cdb${token}other`,
              document_id: nonMatchingDocument.id,
              batch_id: otherBatch.id,
              processing_details: JSON.stringify({}),
            },
          ],
        })

        const result = await getDocumentsForCollection(
          collection.id,
          {
            batch: 'Collection Special RCR Writngs September 25 2025',
            pageSize: 100,
          },
          tx,
        )

        expect(result.documents.map((document) => document.id)).toEqual([matchingDocument.id])
      })
    })
  })

  describe('getDocumentsNotInCollection', () => {
    it('returns documents not in the collection', async () => {
      await withRollbackTransaction(async () => {
        const collections = await getCollections()
        expect(collections.length).toBeGreaterThan(0)

        const { documents: docs } = await getDocumentsNotInCollection(collections[0].id)
        expect(Array.isArray(docs)).toBe(true)
      })
    })
  })

  describe('getCollectionDocuments (server page)', () => {
    it('returns documents for a real collection', async () => {
      await withRollbackTransaction(async () => {
        const collections = await getCollections()
        expect(collections.length).toBeGreaterThan(0)

        const docs = await getCollectionDocuments(collections[0].id)
        expect(Array.isArray(docs)).toBe(true)
      })
    })
  })
})
