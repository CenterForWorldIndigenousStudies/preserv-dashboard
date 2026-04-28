import { afterAll, afterEach, beforeAll, describe, it, expect } from 'vitest'
import { db } from '@lib/db'
import { getAllDocuments, getDocuments } from '@lib/queries'

describe('documents queries (integration)', () => {
  // Track IDs for cleanup
  const createdDocIds: string[] = []
  const createdAuthorIds: string[] = []
  const createdBatchIds: string[] = []
  const createdTagIds: string[] = []
  let sourceIdMetadataId: string
  let duplicateTagId: string
  let restrictedAccessLevelId: string

  beforeAll(async () => {
    await db.$connect()
    const [sourceMetadata, duplicateTag, accessLevels] = await Promise.all([
      db.metadata.findFirst({ where: { name: 'source_id' }, select: { id: true } }),
      db.tags.findFirst({ where: { name: 'duplicate_document' }, select: { id: true } }),
      db.access_levels.findMany({ select: { id: true, level_name: true } }),
    ])
    const restrictedAccessLevel = accessLevels.find((accessLevel) => accessLevel.level_name.toLowerCase() === 'restricted')
    if (!sourceMetadata || !duplicateTag || !restrictedAccessLevel) {
      throw new Error('Expected source_id metadata, duplicate_document tag, and restricted access level to exist in integration DB')
    }
    sourceIdMetadataId = sourceMetadata.id
    duplicateTagId = duplicateTag.id
    restrictedAccessLevelId = restrictedAccessLevel.id
  })

  afterEach(async () => {
    if (createdDocIds.length > 0) {
      await db.documents.deleteMany({ where: { id: { in: [...createdDocIds] } } })
      createdDocIds.splice(0)
    }

    if (createdAuthorIds.length > 0) {
      await db.authors.deleteMany({ where: { id: { in: [...createdAuthorIds] } } })
      createdAuthorIds.splice(0)
    }

    if (createdBatchIds.length > 0) {
      await db.batches.deleteMany({ where: { id: { in: [...createdBatchIds] } } })
      createdBatchIds.splice(0)
    }

    if (createdTagIds.length > 0) {
      await db.tags.deleteMany({ where: { id: { in: [...createdTagIds] } } })
      createdTagIds.splice(0)
    }
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
        doc = await db.documents.create({
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
    createdDocIds.push(doc.id)
    return doc
  }

  const createTestAuthor = async (name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const author = await db.authors.create({
      data: {
        id: `a${token}`,
        name,
      },
      select: { id: true },
    })
    createdAuthorIds.push(author.id)
    return author
  }

  const createTestBatch = async (name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const batch = await db.batches.create({
      data: {
        id: `b${token}`,
        id_legacy: `legacy-${token}`,
        name,
      },
      select: { id: true },
    })
    createdBatchIds.push(batch.id)
    return batch
  }

  const createTestTag = async (name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const tag = await db.tags.create({
      data: {
        id: `g${token}`,
        name,
      },
      select: { id: true },
    })
    createdTagIds.push(tag.id)
    return tag
  }

  const linkAuthorToDocument = async (documentId: string, authorId: string): Promise<void> => {
    await db.document_to_authors.create({
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
      const doc = await createTestDocument({ name: 'Shape Test Doc' })

      const result = await getAllDocuments()

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

    it('paginates correctly with cursors', async () => {
      await createTestDocument({ name: 'Page Test 1' })
      await createTestDocument({ name: 'Page Test 2' })
      await createTestDocument({ name: 'Page Test 3' })

      const page1 = await getAllDocuments({ page: 1, pageSize: 2 })
      const page2 = await getAllDocuments({
        page: 2,
        pageSize: 2,
        cursorValue: page1.pageInfo.endCursor?.value,
        cursorId: page1.pageInfo.endCursor?.id,
        cursorDirection: 'next',
      })

      expect(page1.data.length).toBeLessThanOrEqual(2)
      expect(page2.data.length).toBeLessThanOrEqual(2)

      const page1Ids = new Set(page1.data.map((d) => d.id))
      const overlap = page2.data.filter((d) => page1Ids.has(d.id))
      expect(overlap).toHaveLength(0)
    })

    it('sorts by name ascending', async () => {
      await createTestDocument({ name: 'Zebra Document' })
      await createTestDocument({ name: 'Alpha Document' })
      await createTestDocument({ name: 'Middle Document' })

      const result = await getAllDocuments({
        orderBy: 'name',
        sortDirection: 'asc',
        pageSize: 100,
      })

      const ourDocs = result.data.filter((d) =>
        ['Zebra Document', 'Alpha Document', 'Middle Document'].includes(d.name ?? ''),
      )

      if (ourDocs.length >= 2) {
        const names = ourDocs.map((d) => d.name)
        const sorted = [...names].sort()
        expect(names).toEqual(sorted)
      }
    })

    it('filters by author search term', async () => {
      const doc = await createTestDocument({ name: 'UNIQUE_SEARCH_TERM_123xyz' })
      const author = await createTestAuthor('UNIQUE_SEARCH_TERM_123xyz Author')
      await linkAuthorToDocument(doc.id, author.id)

      const result = await getAllDocuments({ search: 'UNIQUE_SEARCH_TERM_123xyz' })

      const found = result.data.find((d) => d.id === doc.id)
      expect(found).toBeDefined()
    })

    it('sorts by source_id ascending', async () => {
      const docA = await createTestDocument({ name: 'SORT_PAIR_SOURCE A' })
      const docB = await createTestDocument({ name: 'SORT_PAIR_SOURCE B' })
      const author = await createTestAuthor('SORT_PAIR_SOURCE Author')
      await Promise.all([linkAuthorToDocument(docA.id, author.id), linkAuthorToDocument(docB.id, author.id)])

      await db.document_to_metadata.createMany({
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

      const result = await getAllDocuments({
        orderBy: 'source_id',
        sortDirection: 'asc',
        pageSize: 100,
        search: 'SORT_PAIR_SOURCE Author',
      })

      const ourDocs = result.data.filter((d) => ['SORT_PAIR_SOURCE A', 'SORT_PAIR_SOURCE B'].includes(d.name ?? ''))
      expect(ourDocs.map((d) => d.source_id)).toEqual(['AAA', 'ZZZ'])
    }, 15000)

    it('sorts by is_duplicate descending', async () => {
      const plainDoc = await createTestDocument({ name: 'SORT_PAIR_DUP Plain' })
      const duplicateDoc = await createTestDocument({ name: 'SORT_PAIR_DUP Duplicate' })
      const author = await createTestAuthor('SORT_PAIR_DUP Author')
      await Promise.all([linkAuthorToDocument(plainDoc.id, author.id), linkAuthorToDocument(duplicateDoc.id, author.id)])

      await db.document_to_tags.create({
        data: {
          id: `t-${duplicateDoc.id}`,
          document_id: duplicateDoc.id,
          tag_id: duplicateTagId,
        },
      })

      const result = await getAllDocuments({
        orderBy: 'is_duplicate',
        sortDirection: 'desc',
        pageSize: 100,
        search: 'SORT_PAIR_DUP Author',
      })

      const ourDocs = result.data.filter((d) => ['SORT_PAIR_DUP Plain', 'SORT_PAIR_DUP Duplicate'].includes(d.name ?? ''))
      expect(ourDocs[0]?.name).toBe('SORT_PAIR_DUP Duplicate')
      expect(ourDocs[0]?.is_duplicate).toBe(true)
      expect(ourDocs[1]?.name).toBe('SORT_PAIR_DUP Plain')
      expect(ourDocs[1]?.is_duplicate).toBe(false)
    }, 15000)

    it('applies advanced search filters together', async () => {
      const matchingDoc = await createTestDocument({ name: 'ADVANCED_SEARCH_MATCH' })
      const nonMatchingDoc = await createTestDocument({ name: 'ADVANCED_SEARCH_MISS' })
      const author = await createTestAuthor('Mary Filter Person')
      const batch = await createTestBatch('Overview Advanced Batch')
      const collectionTag = await createTestTag('Overview Advanced Collection')

      await linkAuthorToDocument(matchingDoc.id, author.id)
      await db.document_to_batches.create({
        data: {
          id: `ab-${matchingDoc.id}`,
          document_id: matchingDoc.id,
          batch_id: batch.id,
        },
      })
      await db.document_quality.create({
        data: {
          id: `aq-${matchingDoc.id}`,
          document_id: matchingDoc.id,
          validation_status: 'APPROVED',
          access_level: restrictedAccessLevelId,
        },
      })
      await db.document_to_tags.createMany({
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

      await db.document_quality.create({
        data: {
          id: `aq-${nonMatchingDoc.id}`,
          document_id: nonMatchingDoc.id,
          validation_status: 'FAILED',
          access_level: restrictedAccessLevelId,
        },
      })

      const result = await getAllDocuments({
        pageSize: 100,
        search: 'Mary Filter',
        statuses: ['approved'],
        documentType: 'duplicate',
        batch: 'Advanced Batch',
        collection: 'Overview Advanced Collection',
        accessLevel: 'restricted',
      })

      const resultIds = result.data.map((document) => document.id)
      expect(resultIds).toContain(matchingDoc.id)
      expect(resultIds).not.toContain(nonMatchingDoc.id)
    }, 15000)
  })

  // ---------------------------------------------------------------------------
  // getDocuments
  // ---------------------------------------------------------------------------
  describe('getDocuments', () => {
    it('returns items with correct shape', async () => {
      const doc = await createTestDocument({ name: 'GetDocs Shape Test' })

      const result = await getDocuments()

      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('total')
      expect(Array.isArray(result.items)).toBe(true)

      const found = result.items.find((d) => d.id === doc.id)
      expect(found).toBeDefined()
    })

    it('paginates with PAGE_SIZE of 20', async () => {
      const inserts = Array.from({ length: 5 }, (_, i) => createTestDocument({ name: `GetDocs Pagination ${i}` }))
      await Promise.all(inserts)

      const result = await getDocuments({ page: 1 })

      expect(result.items.length).toBeLessThanOrEqual(20)
    })
  })
})
