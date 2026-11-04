import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '@lib/db'
import { createPublicationBatchInTransaction } from '@lib/queries/readyForLibraryPublicationQueries'
import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('selected publication batches', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('claims exactly the selected approved source and replays one operation', async () => {
    await withRollbackTransaction(async (tx) => {
      const sourceId = randomUUID()
      const neighborId = randomUUID()
      const sourceBatchId = randomUUID()
      const tagId = randomUUID()
      const metadataDefinition = await tx.metadata.findFirst({ where: { name: 'preservation_candidate' } })
      const accessLevel = await tx.access_levels.findFirst({ where: { level_name: 'restricted' } })
      if (!metadataDefinition || !accessLevel) throw new Error('Test schema lacks readiness definitions.')

      await tx.batches.create({ data: { id: sourceBatchId, name: `Original ${sourceBatchId}`, processing_details: '{}' } })
      await tx.documents.createMany({ data: [
        { id: sourceId, name: 'Selected document' },
        { id: neighborId, name: 'Unselected neighbor' },
      ] })
      await tx.document_to_batches.createMany({ data: [
        { id: randomUUID(), batch_id: sourceBatchId, document_id: sourceId, processing_details: '{}' },
        { id: randomUUID(), batch_id: sourceBatchId, document_id: neighborId, processing_details: '{}' },
      ] })
      await tx.document_to_metadata.create({ data: {
        id: randomUUID(), document_id: sourceId, metadata_id: metadataDefinition.id,
        value: 'true', value_type: 'boolean',
      } })
      await tx.document_quality.create({ data: {
        id: randomUUID(), document_id: sourceId, validation_status: 'APPROVED',
      } })
      await tx.state_history.create({ data: {
        id: randomUUID(), document_id: sourceId,
        previous_state: 'metadata_validated', new_state: 'approved', changed_at: new Date(),
      } })
      await tx.document_access.create({ data: {
        id: randomUUID(), document_id: sourceId, access_level_id: accessLevel.id,
      } })
      await tx.tags.create({ data: { id: tagId, name: `Publication qualifier ${tagId}` } })
      await tx.collections.create({ data: { id: randomUUID(), tag_id: tagId, fedora_node_id: '50' } })
      await tx.document_to_tags.create({ data: { id: randomUUID(), document_id: sourceId, tag_id: tagId } })

      const operationId = randomUUID()
      const input = { documentIds: [sourceId], name: `Publish ${operationId}`, operationId, startedBy: 'operator@example.org' }
      const created = await createPublicationBatchInTransaction(tx, input)
      expect(created.ok).toBe(true)
      if (!created.ok) return
      const replay = await createPublicationBatchInTransaction(tx, input)
      expect(replay).toEqual(created)
      const collision = await createPublicationBatchInTransaction(tx, {
        ...input, operationId: randomUUID(), name: `Other ${operationId}`,
      })
      expect(collision.ok).toBe(false)

      const batchLinks = await tx.document_to_batches.findMany({ where: { batch_id: created.batchId } })
      expect(batchLinks.map((link) => link.document_id)).toEqual([sourceId])
      expect((await tx.document_to_batches.count({ where: { batch_id: sourceBatchId } }))).toBe(2)
      expect((await tx.publication_source_claims.findUnique({ where: { source_document_id: sourceId } }))?.attempt_id).toBeDefined()
    })
  })
})
