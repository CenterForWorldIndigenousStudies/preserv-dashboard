import { randomUUID } from 'node:crypto'
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
})
