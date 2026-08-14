import { randomUUID } from 'node:crypto'
import type { Prisma } from '@lib/prisma/generated/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '@lib/db'
import { getBatchDetail, getBatchOverviewMetrics, getBatches } from '@lib/queries/batchQueries'
import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('batch queries (integration)', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('searches, sorts, paginates, and maps batch details', async () => {
    await withRollbackTransaction(async (tx) => {
      const baselineOverview = await getBatchOverviewMetrics(tx)
      const firstId = randomUUID()
      const secondId = randomUUID()
      const first = await tx.batches.create({
        data: {
          id: firstId,
          id_legacy: 'LEGACY-INTEGRATION-ALPHA',
          name: 'Integration Batch Alpha',
          started_by: 'integration@example.org',
          started_at: new Date('2026-01-01T00:00:00.000Z'),
          processing_details: JSON.stringify({ total_documents: 3, batch_statistics: { speed: 12 } }),
        },
      })
      await tx.batches.create({
        data: {
          id: secondId,
          name: 'Integration Batch Beta',
          started_at: new Date('2026-02-01T00:00:00.000Z'),
          processing_details: JSON.stringify({ total_documents: 5 }),
        },
      })
      await Promise.all(
        Array.from({ length: 24 }, (_, index) =>
          tx.batches.create({
            data: {
              id: randomUUID(),
              name: `Integration Batch Extra ${index}`,
              processing_details: JSON.stringify({}),
            },
          }),
        ),
      )

      const result = await getBatches(
        {
          page: 1,
          pageSize: 25,
          search: 'Integration Batch',
          orderBy: 'name',
          sortDirection: 'asc',
          filters: {},
        },
        tx,
      )
      const overview = await getBatchOverviewMetrics(tx)
      const detail = await getBatchDetail(first.id, tx)

      expect(result.totalCount).toBe(26)
      expect(result.data).toHaveLength(25)
      expect(result.data[0]).toMatchObject({
        id: firstId,
        idLegacy: 'LEGACY-INTEGRATION-ALPHA',
        name: 'Integration Batch Alpha',
        documentCount: 3,
      })
      expect(result.pageInfo.hasNextPage).toBe(true)
      expect(overview).toEqual({
        totalBatches: baselineOverview.totalBatches + 26,
        totalDocuments: baselineOverview.totalDocuments + 8,
      })
      expect(detail?.properties).toEqual([
        { key: 'total_documents', value: 3 },
        { key: 'batch_statistics', value: { speed: 12 } },
        { key: 'Total Cost', value: '$0.00' },
        { key: 'Processing Time (seconds)', value: 12 },
      ])
      expect(detail).toMatchObject({ startedBy: 'integration@example.org' })
      await expect(getBatchDetail(randomUUID(), tx)).resolves.toBeNull()
    })
  })

  it('filters batches through associated document criteria and updates metrics', async () => {
    await withRollbackTransaction(async (tx) => {
      const token = randomUUID().replaceAll('-', '')
      const restrictedAccess = await tx.access_levels.findFirst({
        where: { level_name: 'restricted' },
        select: { id: true },
      })
      const publicAccess = await tx.access_levels.findFirst({
        where: { level_name: 'public' },
        select: { id: true },
      })
      const duplicateTag = await tx.tags.findFirst({
        where: { name: 'duplicate_document' },
        select: { id: true },
      })

      if (!restrictedAccess || !publicAccess || !duplicateTag) {
        throw new Error('Expected public and restricted access levels and duplicate_document tag in integration DB')
      }
      const duplicateTagId = duplicateTag.id

      const author = await tx.authors.create({
        data: { id: randomUUID(), name: 'Ada Integration Author' },
        select: { id: true },
      })
      const collectionTag = await tx.tags.create({
        data: { id: randomUUID(), name: 'Batch Filter Collection' },
        select: { id: true },
      })
      await tx.collections.create({ data: { id: randomUUID(), tag_id: collectionTag.id } })
      const searchTag = await tx.tags.create({
        data: { id: randomUUID(), name: 'Batch Filter Tag' },
        select: { id: true },
      })

      const matchingBatch = await tx.batches.create({
        data: {
          id: randomUUID(),
          name: 'Matching Batch Filter Integration',
          processing_details: JSON.stringify({ total_documents: 1 }),
        },
        select: { id: true },
      })
      const otherBatch = await tx.batches.create({
        data: {
          id: randomUUID(),
          name: 'Other Batch Filter Integration',
          processing_details: JSON.stringify({ total_documents: 1 }),
        },
        select: { id: true },
      })

      async function createFilteredDocument(options: {
        id: string
        createdAt: Date
        batchId: string
        authorId?: string
        includeCollection?: boolean
        includeSearchTag?: boolean
        includeDuplicate?: boolean
        accessLevelId: string
        validationStatus: 'APPROVED' | 'REJECTED'
      }): Promise<void> {
        await tx.documents.create({
          data: {
            id: options.id,
            name: `Batch Filter Document ${options.id}`,
            created_at: options.createdAt,
            updated_at: options.createdAt,
          },
        })
        await tx.document_quality.create({
          data: {
            id: randomUUID(),
            document_id: options.id,
            validation_status: options.validationStatus,
          },
        })
        await tx.document_to_batches.create({
          data: {
            id: randomUUID(),
            document_id: options.id,
            batch_id: options.batchId,
            processing_details: JSON.stringify({}),
          },
        })
        await tx.document_access.create({
          data: {
            id: randomUUID(),
            document_id: options.id,
            access_level_id: options.accessLevelId,
          },
        })

        if (options.authorId) {
          await tx.document_to_authors.create({
            data: { id: randomUUID(), document_id: options.id, author_id: options.authorId },
          })
        }

        const documentTags: Prisma.document_to_tagsCreateManyInput[] = []
        if (options.includeCollection) {
          documentTags.push({ id: randomUUID(), document_id: options.id, tag_id: collectionTag.id })
        }
        if (options.includeSearchTag) {
          documentTags.push({ id: randomUUID(), document_id: options.id, tag_id: searchTag.id })
        }
        if (options.includeDuplicate) {
          documentTags.push({ id: randomUUID(), document_id: options.id, tag_id: duplicateTagId })
        }
        if (documentTags.length > 0) {
          await tx.document_to_tags.createMany({ data: documentTags })
        }
      }

      await createFilteredDocument({
        id: `d${token}match`.slice(0, 36),
        createdAt: new Date('2026-03-15T12:00:00.000Z'),
        batchId: matchingBatch.id,
        authorId: author.id,
        includeCollection: true,
        includeSearchTag: true,
        includeDuplicate: true,
        accessLevelId: restrictedAccess.id,
        validationStatus: 'APPROVED',
      })
      await createFilteredDocument({
        id: `d${token}other`.slice(0, 36),
        createdAt: new Date('2026-02-15T12:00:00.000Z'),
        batchId: otherBatch.id,
        accessLevelId: publicAccess.id,
        validationStatus: 'REJECTED',
      })

      const filters = [
        { label: 'author', filter: { author: 'Ada Integration Author' } },
        { label: 'tag', filter: { tag: 'Batch Filter Tag' } },
        { label: 'statuses', filter: { statuses: ['APPROVED'] } },
        { label: 'document type', filter: { documentType: 'duplicate' as const } },
        { label: 'batch', filter: { batch: 'Matching Batch Filter Integration' } },
        {
          label: 'created date range',
          filter: { createdFrom: '2026-03-15', createdTo: '2026-03-15' },
        },
        { label: 'collection', filter: { collection: 'Batch Filter Collection' } },
        { label: 'access level', filter: { accessLevel: 'restricted' as const } },
      ]

      for (const filter of filters) {
        // Keep these checks sequential because they share one rollback transaction.
        // eslint-disable-next-line no-await-in-loop
        const result = await getBatches({ page: 1, pageSize: 25, filters: filter.filter }, tx)
        expect(
          result.data.map((item) => item.id),
          filter.label,
        ).toEqual([matchingBatch.id])
      }

      const combinedQuery = {
        page: 1,
        pageSize: 25,
        filters: {
          author: 'Ada Integration Author',
          tag: 'Batch Filter Tag',
          statuses: ['APPROVED'],
          documentType: 'duplicate' as const,
          batch: 'Matching Batch Filter Integration',
          createdFrom: '2026-03-15',
          createdTo: '2026-03-15',
          collection: 'Batch Filter Collection',
          accessLevel: 'restricted' as const,
        },
      }
      await expect(getBatchOverviewMetrics(combinedQuery, tx)).resolves.toEqual({
        totalBatches: 1,
        totalDocuments: 1,
      })
    })
  })
})
