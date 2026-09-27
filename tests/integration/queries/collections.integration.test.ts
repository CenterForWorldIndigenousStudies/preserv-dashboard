import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { db } from '@lib/db'

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import {
  createCollectionInTransaction,
  getCollectionPage,
  getCollections,
  getCollectionDocuments,
  getDocumentsForCollection,
  getDocumentsNotInCollection,
  renameCollectionInTransaction,
  updateCollectionInTransaction,
} from '@lib/queries/collectionQueries'
import { getDocumentFilterOptions } from '@lib/queries/queries'
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

  describe('getCollectionPage', () => {
    it('includes a collection when one live member matches an advanced document filter', async () => {
      await withRollbackTransaction(async (tx) => {
        const matchingTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Advanced Match Collection ${randomUUID()}` },
          select: { id: true },
        })
        const nonMatchingTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Advanced Nonmatch Collection ${randomUUID()}` },
          select: { id: true },
        })
        const matchingCollection = await tx.collections.create({
          data: { id: randomUUID(), tag_id: matchingTag.id },
          select: { id: true },
        })
        const nonMatchingCollection = await tx.collections.create({
          data: { id: randomUUID(), tag_id: nonMatchingTag.id },
          select: { id: true },
        })
        const matchingDocument = await tx.documents.create({
          data: {
            id: randomUUID(),
            name: 'Advanced filter match',
            hash_binary: randomUUID(),
            hash_content: randomUUID(),
            filesize: BigInt(1),
          },
          select: { id: true },
        })
        const nonMatchingDocument = await tx.documents.create({
          data: {
            id: randomUUID(),
            name: 'Advanced filter non-match',
            hash_binary: randomUUID(),
            hash_content: randomUUID(),
            filesize: BigInt(1),
          },
          select: { id: true },
        })
        await tx.document_to_tags.createMany({
          data: [
            { id: randomUUID(), document_id: matchingDocument.id, tag_id: matchingTag.id },
            { id: randomUUID(), document_id: nonMatchingDocument.id, tag_id: nonMatchingTag.id },
          ],
        })
        await tx.document_quality.createMany({
          data: [
            { id: randomUUID(), document_id: matchingDocument.id, validation_status: 'VALIDATED' },
            { id: randomUUID(), document_id: nonMatchingDocument.id, validation_status: 'REJECTED' },
          ],
        })

        const result = await getCollectionPage(
          {
            page: 1,
            pageSize: 25,
            filters: { statuses: ['VALIDATED'] },
          },
          tx,
        )

        expect(result.data.map((collection) => collection.id)).toContain(matchingCollection.id)
        expect(result.data.map((collection) => collection.id)).not.toContain(nonMatchingCollection.id)
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

    it('includes a document that matches a qualifier only through dc_subject metadata', async () => {
      await withRollbackTransaction(async (tx) => {
        const canonicalTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Metadata Collection ${randomUUID()}` },
          select: { id: true },
        })
        const qualifierTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Metadata Subject ${randomUUID()}` },
          select: { id: true, name: true },
        })
        const collection = await tx.collections.create({
          data: { id: randomUUID(), tag_id: canonicalTag.id, fedora_node_id: '17' },
          select: { id: true },
        })
        await tx.collection_qualifiers.create({
          data: { id: randomUUID(), collection_id: collection.id, tag_id: qualifierTag.id },
        })
        const subjectMetadata = await tx.metadata.findFirst({
          where: { name: 'dc_subject' },
          select: { id: true },
        })
        if (!subjectMetadata) throw new Error('Expected dc_subject metadata definition in integration DB')

        const document = await tx.documents.create({
          data: {
            id: randomUUID(),
            name: 'Metadata-only collection member',
            hash_binary: randomUUID(),
            hash_content: randomUUID(),
            filesize: BigInt(1),
          },
          select: { id: true },
        })
        await tx.document_to_metadata.create({
          data: {
            id: randomUUID(),
            document_id: document.id,
            metadata_id: subjectMetadata.id,
            value: JSON.stringify({ value: [`  ${qualifierTag.name}  `] }),
            value_type: 'json',
          },
        })

        const result = await getDocumentsForCollection(collection.id, { pageSize: 100 }, tx)

        expect(result.documents.map((candidate) => candidate.id)).toContain(document.id)
        const collectionOverview = await getCollections(tx)
        expect(collectionOverview.find((candidate) => candidate.id === collection.id)).toMatchObject({
          document_count: 1,
          fedora_node_id: '17',
          canonical_tag: { id: canonicalTag.id },
          qualifiers: [{ id: qualifierTag.id, name: qualifierTag.name }],
        })
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

  describe('updateCollection', () => {
    it('replaces additional qualifiers and updates collection configuration without changing the canonical tag', async () => {
      await withRollbackTransaction(async (tx) => {
        const canonicalTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Canonical ${randomUUID()}` },
          select: { id: true },
        })
        const oldQualifier = await tx.tags.create({
          data: { id: randomUUID(), name: `Old qualifier ${randomUUID()}` },
          select: { id: true },
        })
        const nextQualifier = await tx.tags.create({
          data: { id: randomUUID(), name: `Next qualifier ${randomUUID()}` },
          select: { id: true },
        })
        const collection = await tx.collections.create({
          data: {
            id: randomUUID(),
            tag_id: canonicalTag.id,
            fedora_node_id: '17',
            notes: 'Original notes',
          },
          select: { id: true, tag_id: true },
        })
        await tx.collection_qualifiers.create({
          data: { id: randomUUID(), collection_id: collection.id, tag_id: oldQualifier.id },
        })

        await updateCollectionInTransaction(tx, {
          collectionId: collection.id,
          qualifierTagIds: [nextQualifier.id],
          collectionNotes: 'Updated notes',
          fedoraNodeId: '88',
        })

        const updated = await tx.collections.findUniqueOrThrow({
          where: { id: collection.id },
          include: { collection_qualifiers: { select: { tag_id: true } } },
        })
        expect(updated.tag_id).toBe(canonicalTag.id)
        expect(updated.notes).toBe('Updated notes')
        expect(updated.fedora_node_id).toBe('88')
        expect(updated.collection_qualifiers.map((qualifier) => qualifier.tag_id)).toEqual([nextQualifier.id])
      })
    })

    it('creates a requested qualifier tag when no existing tag is selected', async () => {
      await withRollbackTransaction(async (tx) => {
        const canonicalTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Canonical ${randomUUID()}` },
          select: { id: true },
        })
        const collection = await tx.collections.create({
          data: { id: randomUUID(), tag_id: canonicalTag.id },
          select: { id: true },
        })
        const qualifierName = `Created qualifier ${randomUUID()}`

        await updateCollectionInTransaction(tx, {
          collectionId: collection.id,
          qualifierTagIds: [],
          qualifierTagNames: [qualifierName],
        })

        const createdTag = await tx.tags.findFirst({
          where: { name: qualifierName },
          select: { id: true },
        })
        expect(createdTag).not.toBeNull()
        const qualifiers = await tx.collection_qualifiers.findMany({
          where: { collection_id: collection.id },
          select: { tag_id: true },
        })
        expect(qualifiers).toEqual([{ tag_id: createdTag?.id }])
      })
    })
  })

  describe('renameCollection', () => {
    it('replaces the canonical tag and keeps current calculated members by default', async () => {
      await withRollbackTransaction(async (tx) => {
        const oldCanonicalTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Old canonical ${randomUUID()}` },
          select: { id: true },
        })
        const newCanonicalTag = await tx.tags.create({
          data: { id: randomUUID(), name: `New canonical ${randomUUID()}` },
          select: { id: true },
        })
        const collection = await tx.collections.create({
          data: { id: randomUUID(), tag_id: oldCanonicalTag.id },
          select: { id: true },
        })
        const document = await tx.documents.create({
          data: {
            id: randomUUID(),
            name: 'Calculated collection member',
            hash_binary: randomUUID(),
            hash_content: randomUUID(),
            filesize: BigInt(1),
          },
          select: { id: true },
        })
        await tx.document_to_tags.create({
          data: { id: randomUUID(), document_id: document.id, tag_id: oldCanonicalTag.id },
        })

        await renameCollectionInTransaction(tx, {
          collectionId: collection.id,
          nextCanonicalTagId: newCanonicalTag.id,
          keepCurrentMembers: true,
        })

        const renamed = await tx.collections.findUniqueOrThrow({ where: { id: collection.id } })
        expect(renamed.tag_id).toBe(newCanonicalTag.id)
        expect(await tx.tags.findUnique({ where: { id: oldCanonicalTag.id } })).not.toBeNull()
        expect(
          await tx.document_to_tags.findUnique({
            where: { document_id_tag_id: { document_id: document.id, tag_id: newCanonicalTag.id } },
          }),
        ).not.toBeNull()
      })
    })
  })

  describe('createCollection', () => {
    it('creates additional qualifiers and a Fedora node ID with its canonical tag', async () => {
      await withRollbackTransaction(async (tx) => {
        const canonicalTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Create canonical ${randomUUID()}` },
          select: { id: true, name: true },
        })
        const qualifierTag = await tx.tags.create({
          data: { id: randomUUID(), name: `Create qualifier ${randomUUID()}` },
          select: { id: true, name: true },
        })

        const result = await createCollectionInTransaction(tx, {
          tagId: canonicalTag.id,
          qualifierTagIds: [qualifierTag.id],
          collectionNotes: 'Created with qualifiers',
          fedoraNodeId: '50',
        })

        expect(result.collection).toMatchObject({
          tag_id: canonicalTag.id,
          canonical_tag: canonicalTag,
          qualifiers: [qualifierTag],
          fedora_node_id: '50',
          notes: 'Created with qualifiers',
        })
        await expect(
          tx.collection_qualifiers.findMany({ where: { collection_id: result.collection.id, tag_id: qualifierTag.id } }),
        ).resolves.toHaveLength(1)
      })
    })
  })
})
