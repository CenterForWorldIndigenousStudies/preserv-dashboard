import { afterAll, afterEach, beforeAll, describe, it, expect } from 'vitest'
import { db } from '@lib/db'
import { getAllDocuments, getDocuments } from '@lib/queries'

describe('documents queries (integration)', () => {
  // Track IDs for cleanup
  const createdDocIds: string[] = []
  let sourceIdMetadataId: string
  let duplicateTagId: string

  beforeAll(async () => {
    await db.$connect()
    const [sourceMetadata, duplicateTag] = await Promise.all([
      db.metadata.findFirst({ where: { name: 'source_id' }, select: { id: true } }),
      db.tags.findFirst({ where: { name: 'duplicate_document' }, select: { id: true } }),
    ])
    if (!sourceMetadata || !duplicateTag) {
      throw new Error('Expected source_id metadata and duplicate_document tag to exist in integration DB')
    }
    sourceIdMetadataId = sourceMetadata.id
    duplicateTagId = duplicateTag.id
  })

  afterEach(async () => {
    if (createdDocIds.length > 0) {
      await db.documents.deleteMany({ where: { id: { in: [...createdDocIds] } } })
      createdDocIds.splice(0) // clear without reassigning the const variable
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
    return { id: `d${ts}`, idLegacy: `l${ts}` }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        lastErr = err as unknown
      }
    }
    if (!doc) throw lastErr
    createdDocIds.push(doc.id)
    return doc
  }

  // ---------------------------------------------------------------------------
  // getAllDocuments
  // ---------------------------------------------------------------------------
  describe('getAllDocuments', () => {
    it('returns documents with correct shape', async () => {
      const doc = await createTestDocument({ name: 'Shape Test Doc' })

      const result = await getAllDocuments()

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('total')
      expect(Array.isArray(result.data)).toBe(true)
      expect(typeof result.total).toBe('number')

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

    it('paginates correctly', async () => {
      await createTestDocument({ name: 'Page Test 1' })
      await createTestDocument({ name: 'Page Test 2' })
      await createTestDocument({ name: 'Page Test 3' })

      const page1 = await getAllDocuments({ page: 1, pageSize: 2 })
      const page2 = await getAllDocuments({ page: 2, pageSize: 2 })

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

    it('filters by search term', async () => {
      await createTestDocument({ name: 'UNIQUE_SEARCH_TERM_123xyz' })

      const result = await getAllDocuments({ search: 'UNIQUE_SEARCH_TERM_123xyz' })

      expect(result.total).toBeGreaterThanOrEqual(1)
      const found = result.data.find((d) => d.name === 'UNIQUE_SEARCH_TERM_123xyz')
      expect(found).toBeDefined()
    })

    it('sorts by source_id ascending', async () => {
      const docA = await createTestDocument({ name: 'SORT_PAIR_SOURCE A' })
      const docB = await createTestDocument({ name: 'SORT_PAIR_SOURCE B' })

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
        search: 'SORT_PAIR_SOURCE',
      })

      const ourDocs = result.data.filter((d) => ['SORT_PAIR_SOURCE A', 'SORT_PAIR_SOURCE B'].includes(d.name ?? ''))
      expect(ourDocs.map((d) => d.source_id)).toEqual(['AAA', 'ZZZ'])
    }, 15000)

    it('sorts by is_duplicate descending', async () => {
      await createTestDocument({ name: 'SORT_PAIR_DUP Plain' })
      const duplicateDoc = await createTestDocument({ name: 'SORT_PAIR_DUP Duplicate' })

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
        search: 'SORT_PAIR_DUP',
      })

      const ourDocs = result.data.filter((d) => ['SORT_PAIR_DUP Plain', 'SORT_PAIR_DUP Duplicate'].includes(d.name ?? ''))
      expect(ourDocs[0]?.name).toBe('SORT_PAIR_DUP Duplicate')
      expect(ourDocs[0]?.is_duplicate).toBe(true)
      expect(ourDocs[1]?.name).toBe('SORT_PAIR_DUP Plain')
      expect(ourDocs[1]?.is_duplicate).toBe(false)
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
