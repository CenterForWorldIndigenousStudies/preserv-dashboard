import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@lib/db'
import {
  getCollections,
  getCollectionDocuments,
  getDocumentsForCollection,
  getDocumentsNotInCollection,
} from '@lib/queries'
import { resetTestDatabase } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

describe('collection queries (integration)', () => {
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
  })

  describe('getDocumentsForCollection', () => {
    it('returns documents for a real collection id', async () => {
      await withRollbackTransaction(async () => {
        const collections = await getCollections()
        expect(collections.length).toBeGreaterThan(0)

        const docs = await getDocumentsForCollection(collections[0].id)
        expect(Array.isArray(docs)).toBe(true)
      })
    })

    it('returns an empty array for a non-existent collection id', async () => {
      await withRollbackTransaction(async () => {
        const docs = await getDocumentsForCollection('00000000-0000-0000-0000-000000000000')
        expect(docs).toEqual([])
      })
    })
  })

  describe('getDocumentsNotInCollection', () => {
    it('returns documents not in the collection', async () => {
      await withRollbackTransaction(async () => {
        const collections = await getCollections()
        expect(collections.length).toBeGreaterThan(0)

        const docs = await getDocumentsNotInCollection(collections[0].id)
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
