import type { Prisma } from '@lib/prisma/generated/client'
import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest'
import { db } from '@lib/db'

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import { getAllDocuments, getDocuments } from '@lib/queries'
import { resetTestDatabase } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

describe('documents queries (integration)', () => {
  let sourceIdMetadataId: string
  let duplicateTagId: string
  let restrictedAccessLevelId: string

  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
    const [sourceMetadata, duplicateTag, accessLevels] = await Promise.all([
      db.metadata.findFirst({ where: { name: 'source_id' }, select: { id: true } }),
      db.tags.findFirst({ where: { name: 'duplicate_document' }, select: { id: true } }),
      db.access_levels.findMany({ select: { id: true, level_name: true } }),
    ])
    const restrictedAccessLevel = accessLevels.find(
      (accessLevel) => accessLevel.level_name.toLowerCase() === 'restricted',
    )
    if (!sourceMetadata || !duplicateTag || !restrictedAccessLevel) {
      throw new Error(
        'Expected source_id metadata, duplicate_document tag, and restricted access level to exist in integration DB',
      )
    }
    sourceIdMetadataId = sourceMetadata.id
    duplicateTagId = duplicateTag.id
    restrictedAccessLevelId = restrictedAccessLevel.id
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  // ---------------------------------------------------------------------------
  // ID generator — keeps values short enough for VarChar(36) fields
  // ---------------------------------------------------------------------------
  const makeIds = () => {
    const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    return { id: `d${ts}`, idLegacy: `l${ts}`, token: ts }
  }

  // ---------------------------------------------------------------------------
  // Helper: create a test document with retry on uniqueness collisions
  // ---------------------------------------------------------------------------
  const createTestDocument = async (
    tx: Prisma.TransactionClient,
    overrides: {
      id_legacy?: string
      name?: string
      hash_binary?: string
      hash_content?: string
      filesize?: bigint
      created_at?: Date
      updated_at?: Date
    } = {},
  ) => {
    let doc: { id: string } | null = null
    let lastErr: unknown
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const { id, idLegacy } = makeIds()
        // eslint-disable-next-line no-await-in-loop
        doc = await tx.documents.create({
          data: {
            id,
            id_legacy: overrides.id_legacy ?? idLegacy,
            name: overrides.name ?? `Test ${id}`,
            hash_binary: overrides.hash_binary ?? `hb-${id}`,
            hash_content: overrides.hash_content ?? `hc-${id}`,
            filesize: overrides.filesize ?? BigInt(1024),
            created_at: overrides.created_at ?? new Date(),
            updated_at: overrides.updated_at ?? new Date(),
          },
        })
        break
      } catch (err: unknown) {
        lastErr = err
      }
    }
    if (!doc) throw lastErr
    return doc
  }

  const createTestAuthor = async (tx: Prisma.TransactionClient, name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const author = await tx.authors.create({
      data: {
        id: `a${token}`,
        name,
      },
      select: { id: true },
    })
    return author
  }

  const createTestBatch = async (tx: Prisma.TransactionClient, name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const batch = await tx.batches.create({
      data: {
        id: `b${token}`,
        id_legacy: `legacy-${token}`,
        name,
      },
      select: { id: true },
    })
    return batch
  }

  const createTestBatchWithOverrides = async (
    tx: Prisma.TransactionClient,
    overrides: {
      id_legacy?: string | null
      name?: string | null
    } = {},
  ): Promise<{ id: string; id_legacy: string | null; name: string | null }> => {
    const { token } = makeIds()
    return await tx.batches.create({
      data: {
        id: `b${token}`,
        id_legacy: overrides.id_legacy ?? `legacy-${token}`,
        name: overrides.name ?? `Batch ${token}`,
      },
      select: { id: true, id_legacy: true, name: true },
    })
  }

  const createTestTag = async (tx: Prisma.TransactionClient, name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const tag = await tx.tags.create({
      data: {
        id: `g${token}`,
        name,
      },
      select: { id: true },
    })
    return tag
  }

  const linkAuthorToDocument = async (
    tx: Prisma.TransactionClient,
    documentId: string,
    authorId: string,
  ): Promise<void> => {
    await tx.document_to_authors.create({
      data: {
        id: `da-${documentId}-${authorId}`.slice(0, 36),
        document_id: documentId,
        author_id: authorId,
      },
    })
  }

  // ---------------------------------------------------------------------------
  // getAllDocuments
  // ---------------------------------------------------------------------------
  describe('getAllDocuments', () => {
    it('returns documents with correct shape', async () => {
      await withRollbackTransaction(async (tx) => {
        const doc = await createTestDocument(tx, { name: 'Shape Test Doc' })

        const result = await getAllDocuments({}, tx)

        expect(result).toHaveProperty('data')
        expect(result).toHaveProperty('pageInfo')
        expect(Array.isArray(result.data)).toBe(true)
        expect(typeof result.pageInfo.page).toBe('number')

        const found = result.data.find((d) => d.id === doc.id)
        expect(found).toBeDefined()
        expect(found).toHaveProperty('id')
        expect(found).toHaveProperty('name')
        expect(found).toHaveProperty('filesize')
        expect(found).toHaveProperty('hash_binary')
        expect(found).toHaveProperty('hash_content')
        expect(found).toHaveProperty('id_legacy')
        expect(found).toHaveProperty('source_id')
        expect(found).toHaveProperty('created_at')
        expect(found).toHaveProperty('updated_at')
      })
    })

    it('paginates correctly with cursors', async () => {
      await withRollbackTransaction(async (tx) => {
        const batchName = 'CURSOR_PAGINATION_BATCH_20260514'
        const batch = await createTestBatch(tx, batchName)

        await Promise.all(
          Array.from({ length: 30 }, async (_, offset) => {
            const index = offset + 1
            const document = await createTestDocument(tx, {
              name: `CURSOR_PAGINATION_TEST_20260514_${String(index).padStart(2, '0')}`,
            })

            await tx.document_to_batches.create({
              data: {
                id: `db-${document.id}-${batch.id}`.slice(0, 36),
                document_id: document.id,
                batch_id: batch.id,
              },
            })
          }),
        )

        const page1 = await getAllDocuments(
          {
            page: 1,
            pageSize: 25,
            batch: batchName,
            orderBy: 'name',
            sortDirection: 'asc',
          },
          tx,
        )
        const page2 = await getAllDocuments(
          {
            page: 2,
            pageSize: 25,
            batch: batchName,
            orderBy: 'name',
            sortDirection: 'asc',
            cursorValue: page1.pageInfo.endCursor?.value,
            cursorId: page1.pageInfo.endCursor?.id,
            cursorDirection: 'next',
          },
          tx,
        )

        expect(page1.data).toHaveLength(25)
        expect(page2.data).toHaveLength(5)
        expect(page1.pageInfo.hasNextPage).toBe(true)
        expect(page2.pageInfo.hasPreviousPage).toBe(true)

        const page1Batch = await tx.document_to_batches.findMany({
          where: { document_id: { in: page1.data.map((document) => document.id) } },
          select: { batch_id: true },
        })
        const page2Batch = await tx.document_to_batches.findMany({
          where: { document_id: { in: page2.data.map((document) => document.id) } },
          select: { batch_id: true },
        })
        expect(page1Batch.every((row) => row.batch_id === batch.id)).toBe(true)
        expect(page2Batch.every((row) => row.batch_id === batch.id)).toBe(true)

        const page1Ids = new Set(page1.data.map((d) => d.id))
        const overlap = page2.data.filter((d) => page1Ids.has(d.id))
        expect(overlap).toHaveLength(0)
      })
    })

    it('sorts by name ascending', async () => {
      await withRollbackTransaction(async (tx) => {
        await createTestDocument(tx, { name: 'Zebra Document' })
        await createTestDocument(tx, { name: 'Alpha Document' })
        await createTestDocument(tx, { name: 'Middle Document' })

        const result = await getAllDocuments(
          {
            orderBy: 'name',
            sortDirection: 'asc',
            pageSize: 100,
          },
          tx,
        )

        const ourDocs = result.data.filter((d) =>
          ['Zebra Document', 'Alpha Document', 'Middle Document'].includes(d.name ?? ''),
        )

        if (ourDocs.length >= 2) {
          const names = ourDocs.map((d) => d.name)
          const sorted = [...names].sort()
          expect(names).toEqual(sorted)
        }
      })
    })

    it('filters by author search term', async () => {
      await withRollbackTransaction(async (tx) => {
        const doc = await createTestDocument(tx, { name: 'UNIQUE_SEARCH_TERM_123xyz' })
        const author = await createTestAuthor(tx, 'UNIQUE_SEARCH_TERM_123xyz Author')
        await linkAuthorToDocument(tx, doc.id, author.id)

        const result = await getAllDocuments({ search: 'UNIQUE_SEARCH_TERM_123xyz' }, tx)

        const found = result.data.find((d) => d.id === doc.id)
        expect(found).toBeDefined()
      })
    })

    it('sorts by source_id ascending', async () => {
      await withRollbackTransaction(async (tx) => {
        const docA = await createTestDocument(tx, { name: 'SORT_PAIR_SOURCE A' })
        const docB = await createTestDocument(tx, { name: 'SORT_PAIR_SOURCE B' })
        const author = await createTestAuthor(tx, 'SORT_PAIR_SOURCE Author')
        await Promise.all([linkAuthorToDocument(tx, docA.id, author.id), linkAuthorToDocument(tx, docB.id, author.id)])

        await tx.document_to_metadata.createMany({
          data: [
            {
              id: `m-${docA.id}`,
              document_id: docA.id,
              metadata_id: sourceIdMetadataId,
              value: JSON.stringify({ value: 'ZZZ' }),
              value_type: 'string',
            },
            {
              id: `m-${docB.id}`,
              document_id: docB.id,
              metadata_id: sourceIdMetadataId,
              value: JSON.stringify({ value: 'AAA' }),
              value_type: 'string',
            },
          ],
        })

        const result = await getAllDocuments(
          {
            orderBy: 'source_id',
            sortDirection: 'asc',
            pageSize: 100,
            search: 'SORT_PAIR_SOURCE Author',
          },
          tx,
        )

        const ourDocs = result.data.filter((d) => ['SORT_PAIR_SOURCE A', 'SORT_PAIR_SOURCE B'].includes(d.name ?? ''))
        expect(ourDocs.map((d) => d.source_id)).toEqual(['AAA', 'ZZZ'])
      })
    }, 15000)

    it('sorts by is_duplicate descending', async () => {
      await withRollbackTransaction(async (tx) => {
        const plainDoc = await createTestDocument(tx, { name: 'SORT_PAIR_DUP Plain' })
        const duplicateDoc = await createTestDocument(tx, { name: 'SORT_PAIR_DUP Duplicate' })
        const author = await createTestAuthor(tx, 'SORT_PAIR_DUP Author')
        await Promise.all([
          linkAuthorToDocument(tx, plainDoc.id, author.id),
          linkAuthorToDocument(tx, duplicateDoc.id, author.id),
        ])

        await tx.document_to_tags.create({
          data: {
            id: `t-${duplicateDoc.id}`,
            document_id: duplicateDoc.id,
            tag_id: duplicateTagId,
          },
        })

        const result = await getAllDocuments(
          {
            orderBy: 'is_duplicate',
            sortDirection: 'desc',
            pageSize: 100,
            search: 'SORT_PAIR_DUP Author',
          },
          tx,
        )

        const ourDocs = result.data.filter((d) =>
          ['SORT_PAIR_DUP Plain', 'SORT_PAIR_DUP Duplicate'].includes(d.name ?? ''),
        )
        expect(ourDocs[0]?.name).toBe('SORT_PAIR_DUP Duplicate')
        expect(ourDocs[0]?.is_duplicate).toBe(true)
        expect(ourDocs[1]?.name).toBe('SORT_PAIR_DUP Plain')
        expect(ourDocs[1]?.is_duplicate).toBe(false)
      })
    }, 15000)

    it('applies advanced search filters together', async () => {
      await withRollbackTransaction(async (tx) => {
        const matchingDoc = await createTestDocument(tx, { name: 'ADVANCED_SEARCH_MATCH' })
        const nonMatchingDoc = await createTestDocument(tx, { name: 'ADVANCED_SEARCH_MISS' })
        const author = await createTestAuthor(tx, 'Mary Filter Person')
        const batch = await createTestBatch(tx, 'Overview Advanced Batch')
        const collectionTag = await createTestTag(tx, 'Overview Advanced Collection')

        await linkAuthorToDocument(tx, matchingDoc.id, author.id)
        await tx.document_to_batches.create({
          data: {
            id: `ab-${matchingDoc.id}`,
            document_id: matchingDoc.id,
            batch_id: batch.id,
          },
        })
        await tx.document_quality.create({
          data: {
            id: `aq-${matchingDoc.id}`,
            document_id: matchingDoc.id,
            validation_status: 'APPROVED',
          },
        })
        await tx.document_to_tags.createMany({
          data: [
            {
              id: `at-${matchingDoc.id}`,
              document_id: matchingDoc.id,
              tag_id: collectionTag.id,
            },
            {
              id: `ad-${matchingDoc.id}`,
              document_id: matchingDoc.id,
              tag_id: duplicateTagId,
            },
          ],
        })

        await tx.document_access.create({
          data: {
            id: `da-${matchingDoc.id}`,
            document_id: matchingDoc.id,
            access_level_id: restrictedAccessLevelId,
          },
        })

        await tx.document_quality.create({
          data: {
            id: `aq-${nonMatchingDoc.id}`,
            document_id: nonMatchingDoc.id,
            validation_status: 'REJECTED',
          },
        })

        const result = await getAllDocuments(
          {
            pageSize: 100,
            search: 'Mary Filter',
            statuses: ['APPROVED'],
            documentType: 'duplicate',
            batch: 'Advanced Batch',
            collection: 'Overview Advanced Collection',
            accessLevel: 'restricted',
          },
          tx,
        )

        const resultIds = result.data.map((document) => document.id)
        expect(resultIds).toContain(matchingDoc.id)
        expect(resultIds).not.toContain(nonMatchingDoc.id)
      })
    }, 15000)

    it('filters by linked batch origin, legacy id, and legacy_batch_origin metadata when batch name is empty', async () => {
      await withRollbackTransaction(async (tx) => {
        const matchingDoc = await createTestDocument(tx, { name: 'BATCH_LINKED_MATCH' })
        const nonMatchingDoc = await createTestDocument(tx, { name: 'BATCH_LINKED_MISS' })
        const batch = await createTestBatchWithOverrides(tx, {
          id_legacy: 'registry-batch-legacy-20260514',
          name: null,
        })
        const legacyBatchOriginMetadata =
          (await tx.batch_metadata.findFirst({
            where: { name: 'legacy_batch_origin' },
            select: { id: true },
          })) ??
          (await tx.batch_metadata.create({
            data: {
              id: 'legacy-batch-origin-metadata-0001',
              name: 'legacy_batch_origin',
            },
            select: { id: true },
          }))

        await tx.document_to_batches.create({
          data: {
            id: `bo-${matchingDoc.id}`.slice(0, 36),
            document_id: matchingDoc.id,
            batch_id: batch.id,
            batch_origin: 'General Inventory Batch Origin',
          },
        })
        await tx.batch_to_batches_metadata.create({
          data: {
            id: `bbm-${batch.id}`.slice(0, 36),
            batch_id: batch.id,
            batch_metadata_id: legacyBatchOriginMetadata.id,
            value: JSON.stringify('Historic Batch Origin Label'),
            value_type: 'string',
          },
        })

        const batchOriginResult = await getAllDocuments(
          {
            pageSize: 100,
            batch: 'Inventory Batch Origin',
          },
          tx,
        )

        const batchOriginIds = new Set(batchOriginResult.data.map((document) => document.id))
        expect(batchOriginIds.has(matchingDoc.id)).toBe(true)
        expect(batchOriginIds.has(nonMatchingDoc.id)).toBe(false)

        const batchLegacyResult = await getAllDocuments(
          {
            pageSize: 100,
            batch: 'legacy-20260514',
          },
          tx,
        )

        const batchLegacyIds = new Set(batchLegacyResult.data.map((document) => document.id))
        expect(batchLegacyIds.has(matchingDoc.id)).toBe(true)
        expect(batchLegacyIds.has(nonMatchingDoc.id)).toBe(false)

        const batchMetadataResult = await getAllDocuments(
          {
            pageSize: 100,
            batch: 'Historic Batch Origin',
          },
          tx,
        )

        const batchMetadataIds = new Set(batchMetadataResult.data.map((document) => document.id))
        expect(batchMetadataIds.has(matchingDoc.id)).toBe(true)
        expect(batchMetadataIds.has(nonMatchingDoc.id)).toBe(false)
      })
    }, 15000)

    it('filters by fuzzy-matched tags in advanced search', async () => {
      await withRollbackTransaction(async (tx) => {
        const matchingDoc = await createTestDocument(tx, { name: 'FUZZY_TAG_MATCH' })
        const nonMatchingDoc = await createTestDocument(tx, { name: 'FUZZY_TAG_MISS' })
        const matchingTag = await createTestTag(tx, 'aboriginal governance')
        const otherTag = await createTestTag(tx, 'coastal fisheries')

        await tx.document_to_tags.createMany({
          data: [
            {
              id: `ftm-${matchingDoc.id}`.slice(0, 36),
              document_id: matchingDoc.id,
              tag_id: matchingTag.id,
            },
            {
              id: `fto-${nonMatchingDoc.id}`.slice(0, 36),
              document_id: nonMatchingDoc.id,
              tag_id: otherTag.id,
            },
          ],
        })

        const result = await getAllDocuments(
          {
            pageSize: 100,
            tag: 'aborijinal',
          },
          tx,
        )

        const resultIds = new Set(result.data.map((document) => document.id))
        expect(resultIds.has(matchingDoc.id)).toBe(true)
        expect(resultIds.has(nonMatchingDoc.id)).toBe(false)
      })
    }, 15000)
  })

  // ---------------------------------------------------------------------------
  // getDocuments
  // ---------------------------------------------------------------------------
  describe('getDocuments', () => {
    it('returns items with correct shape', async () => {
      await withRollbackTransaction(async (tx) => {
        const doc = await createTestDocument(tx, { name: 'GetDocs Shape Test' })

        const result = await getDocuments({}, tx)

        expect(result).toHaveProperty('items')
        expect(result).toHaveProperty('total')
        expect(Array.isArray(result.items)).toBe(true)

        const found = result.items.find((d) => d.id === doc.id)
        expect(found).toBeDefined()
      })
    })

    it('paginates with PAGE_SIZE of 20', async () => {
      await withRollbackTransaction(async (tx) => {
        const inserts = Array.from({ length: 5 }, (_, i) => createTestDocument(tx, { name: `GetDocs Pagination ${i}` }))
        await Promise.all(inserts)

        const result = await getDocuments({ page: 1 }, tx)

        expect(result.items.length).toBeLessThanOrEqual(20)
      })
    })
  })
})
