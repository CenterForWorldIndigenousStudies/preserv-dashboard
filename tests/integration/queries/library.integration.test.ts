import type { Prisma } from '@lib/prisma/generated/client'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { db } from '@lib/db'
import { getLibraryDocuments } from '@lib/queries/queries'

import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('library documents query (integration)', () => {
  let fedoraUrlMetadataId: string
  let needsReviewMetadataId: string
  let preservationCandidateMetadataId: string

  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()

    const metadata = await db.metadata.findMany({
      where: { name: { in: ['fedora_url', 'needs_review', 'preservation_candidate'] } },
      select: { id: true, name: true },
    })
    const fedoraUrlMetadata = metadata.find((item) => item.name === 'fedora_url')
    const needsReviewMetadata = metadata.find((item) => item.name === 'needs_review')
    const preservationCandidateMetadata = metadata.find((item) => item.name === 'preservation_candidate')
    if (!fedoraUrlMetadata || !needsReviewMetadata || !preservationCandidateMetadata) {
      throw new Error(
        'Expected fedora_url, needs_review, and preservation_candidate metadata to exist in integration DB',
      )
    }
    fedoraUrlMetadataId = fedoraUrlMetadata.id
    needsReviewMetadataId = needsReviewMetadata.id
    preservationCandidateMetadataId = preservationCandidateMetadata.id
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  const makeToken = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

  async function createDocument(
    tx: Prisma.TransactionClient,
    options: {
      name: string
      state: string
      token: string
      uploadedAt: Date
      fedoraUrl?: string
      preservationCandidate?: boolean
    },
  ) {
    const document = await tx.documents.create({
      data: {
        id: `d${options.token}`,
        name: options.name,
        id_legacy: `legacy-${options.token}`,
        hash_binary: `binary-${options.token}`,
        hash_content: `content-${options.token}`,
        filesize: BigInt(100),
      },
      select: { id: true },
    })

    const stateHistory = await tx.state_history.create({
      data: {
        id: `s${options.token}-1`,
        document_id: document.id,
        previous_state: 'approved',
        new_state: options.state,
        changed_at: options.uploadedAt,
      },
      select: { id: true },
    })

    await tx.document_quality.create({
      data: {
        id: `q${options.token}`,
        document_id: document.id,
        validation_status: 'APPROVED',
        current_status: stateHistory.id,
      },
    })

    await tx.document_to_metadata.create({
      data: {
        id: `pc${options.token}`,
        document_id: document.id,
        metadata_id: preservationCandidateMetadataId,
        value: JSON.stringify(options.preservationCandidate ?? true),
        value_type: 'boolean',
      },
    })

    if (options.fedoraUrl) {
      await tx.document_to_metadata.create({
        data: {
          id: `m${options.token}`,
          document_id: document.id,
          metadata_id: fedoraUrlMetadataId,
          value: JSON.stringify({ value: options.fedoraUrl }),
          value_type: 'url',
        },
      })
    }

    return document
  }

  it('returns current ingested documents with metadata, collections, latest batch, and cursor pagination', async () => {
    await withRollbackTransaction(async (tx) => {
      const token = makeToken()
      const uploadedAt = new Date('2026-07-01T12:00:00.000Z')
      const first = await createDocument(tx, {
        name: 'Library Integration Alpha',
        state: 'ingested_fedora',
        token: `${token}a`,
        uploadedAt,
        fedoraUrl: 'https://fedora.example/alpha',
      })
      const second = await createDocument(tx, {
        name: 'Library Integration Beta',
        state: 'ingested_fedora',
        token: `${token}b`,
        uploadedAt: new Date('2026-07-02T12:00:00.000Z'),
        fedoraUrl: 'https://fedora.example/beta',
      })
      const staleAncestor = await createDocument(tx, {
        name: 'Library Integration Stale Ancestor',
        state: 'ingested_fedora',
        token: `${token}ancestor`,
        uploadedAt: new Date('2026-06-30T12:00:00.000Z'),
        preservationCandidate: false,
      })
      await createDocument(tx, {
        name: 'Library Integration Reprocessed',
        state: 'normalized',
        token: `${token}c`,
        uploadedAt: new Date('2026-07-03T12:00:00.000Z'),
        fedoraUrl: 'https://fedora.example/reprocessed',
      })
      await Promise.all(
        Array.from({ length: 24 }, (_, offset) => {
          const index = offset + 1
          return createDocument(tx, {
            name: `Library Integration Extra ${String(index).padStart(2, '0')}`,
            state: 'ingested_fedora',
            token: `${token}e${index}`,
            uploadedAt: new Date(`2026-07-04T12:${String(index).padStart(2, '0')}:00.000Z`),
          })
        }),
      )

      const oldBatch = await tx.batches.create({
        data: {
          id: `b${token}old`,
          name: 'Library Old Batch',
          processing_details: JSON.stringify({}),
          created_at: new Date('2026-06-01T00:00:00.000Z'),
        },
        select: { id: true },
      })
      const newBatch = await tx.batches.create({
        data: {
          id: `b${token}new`,
          name: 'Library New Batch',
          processing_details: JSON.stringify({}),
          created_at: new Date('2026-06-02T00:00:00.000Z'),
        },
        select: { id: true },
      })

      await tx.document_to_batches.createMany({
        data: [
          {
            id: `l${token}old`,
            document_id: first.id,
            batch_id: oldBatch.id,
            added_at: new Date('2026-06-01T10:00:00.000Z'),
            processing_details: JSON.stringify({}),
          },
          {
            id: `l${token}new`,
            document_id: first.id,
            batch_id: newBatch.id,
            added_at: new Date('2026-06-02T10:00:00.000Z'),
            processing_details: JSON.stringify({}),
          },
        ],
      })

      const collectionTag = await tx.tags.create({
        data: { id: `t${token}`, name: 'Library Integration Collection' },
        select: { id: true },
      })
      const collection = await tx.collections.create({
        data: { id: `c${token}`, tag_id: collectionTag.id },
        select: { id: true },
      })
      await tx.document_to_tags.createMany({
        data: [
          { id: `x${token}a`, document_id: first.id, tag_id: collectionTag.id },
          { id: `x${token}b`, document_id: second.id, tag_id: collectionTag.id },
        ],
      })
      await tx.document_to_metadata.create({
        data: {
          id: `n${token}review`,
          document_id: first.id,
          metadata_id: needsReviewMetadataId,
          value: JSON.stringify({ value: { legacy: ['Stale review reason.'] } }),
          value_type: 'json',
        },
      })

      const firstPage = await getLibraryDocuments({ orderBy: 'name', sortDirection: 'asc', pageSize: 25 }, tx)
      expect(firstPage.items).toHaveLength(25)
      expect(firstPage.items[0]).toMatchObject({
        id: first.id,
        fedoraUrl: 'https://fedora.example/alpha',
        uploadedAt: uploadedAt.toISOString(),
        collections: [{ id: collection.id, name: 'Library Integration Collection' }],
        batch: { id: newBatch.id, name: 'Library New Batch' },
      })
      expect(firstPage.total).toBe(26)
      expect(firstPage.items.some((item) => item.id === staleAncestor.id)).toBe(false)
      expect(firstPage.hasNextPage).toBe(true)

      const secondPage = await getLibraryDocuments(
        {
          orderBy: 'name',
          sortDirection: 'asc',
          page: 2,
          pageSize: 25,
          cursorValue: firstPage.endCursor?.value,
          cursorId: firstPage.endCursor?.id,
          cursorDirection: 'next',
        },
        tx,
      )
      expect(secondPage.items).toHaveLength(1)
      expect(secondPage.items[0]?.name).toBe('Library Integration Extra 24')

      const collectionResult = await getLibraryDocuments({ collection: 'Library Integration Collection' }, tx)
      expect(collectionResult.items.map((item) => item.id).sort()).toEqual([first.id, second.id].sort())
      expect(collectionResult.items.some((item) => item.id.includes(`${token}c`))).toBe(false)
    })
  })

  it('fuzzy-matches Batch names and excludes a different Batch name', async () => {
    await withRollbackTransaction(async (tx) => {
      const token = makeToken()
      const matchingDocument = await createDocument(tx, {
        name: 'Library Batch Filter Match',
        state: 'ingested_fedora',
        token: `${token}match`,
        uploadedAt: new Date('2026-07-10T12:00:00.000Z'),
      })
      const wildcardDocument = await createDocument(tx, {
        name: 'Library Batch Filter Wildcard',
        state: 'ingested_fedora',
        token: `${token}wildcard`,
        uploadedAt: new Date('2026-07-11T12:00:00.000Z'),
      })

      const literalBatch = await tx.batches.create({
        data: {
          id: `b${token}literal`,
          name: 'Special RCR Writings September 25 2025',
          processing_details: JSON.stringify({}),
          created_at: new Date('2026-07-10T00:00:00.000Z'),
        },
        select: { id: true },
      })
      const wildcardBatch = await tx.batches.create({
        data: {
          id: `b${token}wildcard`,
          name: 'Coastal Fisheries',
          processing_details: JSON.stringify({}),
          created_at: new Date('2026-07-11T00:00:00.000Z'),
        },
        select: { id: true },
      })

      await tx.document_to_batches.createMany({
        data: [
          {
            id: `l${token}literal`,
            document_id: matchingDocument.id,
            batch_id: literalBatch.id,
            processing_details: JSON.stringify({}),
          },
          {
            id: `l${token}wildcard`,
            document_id: wildcardDocument.id,
            batch_id: wildcardBatch.id,
            processing_details: JSON.stringify({}),
          },
        ],
      })

      const result = await getLibraryDocuments({ batch: 'Special RCR Writngs September 25 2025', pageSize: 100 }, tx)

      expect(result.items.map((item) => item.id)).toEqual([matchingDocument.id])
    })
  })

  it('filters the batch displayed for a document rather than historical batch associations', async () => {
    await withRollbackTransaction(async (tx) => {
      const token = makeToken()
      const document = await createDocument(tx, {
        name: 'Library Latest Batch Filter',
        state: 'ingested_fedora',
        token,
        uploadedAt: new Date('2026-07-12T12:00:00.000Z'),
      })
      const historicalBatch = await tx.batches.create({
        data: {
          id: `b${token}historical`,
          name: 'Historical Special RCR Writings September 25 2025',
          processing_details: JSON.stringify({}),
          created_at: new Date('2026-07-12T00:00:00.000Z'),
        },
        select: { id: true },
      })
      const latestBatch = await tx.batches.create({
        data: {
          id: `b${token}latest`,
          name: 'Unrelated Later Batch',
          processing_details: JSON.stringify({}),
          created_at: new Date('2026-07-13T00:00:00.000Z'),
        },
        select: { id: true },
      })

      await tx.document_to_batches.createMany({
        data: [
          {
            id: `l${token}historical`,
            document_id: document.id,
            batch_id: historicalBatch.id,
            added_at: new Date('2026-07-12T10:00:00.000Z'),
            processing_details: JSON.stringify({}),
          },
          {
            id: `l${token}latest`,
            document_id: document.id,
            batch_id: latestBatch.id,
            added_at: new Date('2026-07-13T10:00:00.000Z'),
            processing_details: JSON.stringify({}),
          },
        ],
      })

      const result = await getLibraryDocuments(
        { batch: 'Historical Special RCR Writngs September 25 2025', pageSize: 100 },
        tx,
      )

      expect(result.items.map((item) => item.id)).not.toContain(document.id)
    })
  })
})
