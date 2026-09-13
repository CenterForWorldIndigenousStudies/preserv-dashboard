import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { db } from '@lib/db'
import {
  applyDocumentEdit,
  applyDocumentEditInTransaction,
  DocumentEditValidationError,
} from '@lib/queries/documentEditQueries'
import { BATCH_LIFECYCLE_STATUSES } from '@constants/batchLifecycleStatuses'
import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

vi.mock('@root/auth', () => ({
  getDashboardSession: () => Promise.resolve({ user: { email: 'integration-editor@example.test' } }),
}))

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('document editing (integration)', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('applies a multi-section edit, audits it, and locks the associated batch atomically', async () => {
    await withRollbackTransaction(async (tx) => {
      const documentId = randomUUID()
      const tagId = randomUUID()
      const contributorId = randomUUID()
      const publisherId = randomUUID()
      const batchId = randomUUID()

      await tx.documents.create({
        data: {
          id: documentId,
          name: 'Document Edit Integration Fixture',
          filesize: BigInt(100),
        },
      })
      const titleMetadata = await tx.metadata.findFirst({ where: { name: 'dc_title' }, select: { id: true } })
      if (!titleMetadata) throw new Error('Expected dc_title metadata definition in integration DB')
      await tx.document_to_metadata.create({
        data: {
          id: randomUUID(),
          document_id: documentId,
          metadata_id: titleMetadata.id,
          value: JSON.stringify({ value: 'Before' }),
          value_type: 'string',
        },
      })
      await tx.document_quality.create({
        data: {
          id: randomUUID(),
          document_id: documentId,
          comment: 'Old control comment',
        },
      })
      await tx.tags.create({ data: { id: tagId, name: `Integration Tag ${documentId}` } })
      await tx.contributors.create({ data: { id: contributorId, name: `Integration Contributor ${documentId}` } })
      await tx.publishers.create({ data: { id: publisherId, name: `Integration Publisher ${documentId}` } })
      await tx.document_to_tags.create({
        data: { id: randomUUID(), document_id: documentId, tag_id: tagId, notes: 'Old tag notes' },
      })
      await tx.document_to_contributors.create({
        data: {
          id: randomUUID(),
          document_id: documentId,
          contributor_id: contributorId,
          role: 'author',
          type: 'SECONDARY',
          notes: 'Old contributor notes',
        },
      })
      await tx.document_to_publishers.create({
        data: { id: randomUUID(), document_id: documentId, publisher_id: publisherId, notes: 'Old publisher notes' },
      })
      await tx.batches.create({
        data: {
          id: batchId,
          name: `Integration Edit Batch ${documentId}`,
          processing_details: JSON.stringify({}),
          lifecycle_status: 'queued',
        },
      })
      await tx.document_to_batches.create({
        data: {
          id: randomUUID(),
          document_id: documentId,
          batch_id: batchId,
          processing_details: JSON.stringify({}),
        },
      })

      const result = await applyDocumentEditInTransaction(tx, {
        documentId,
        editorEmail: 'integration-editor@example.test',
        snapshot: {
          metadata: { dc_title: 'After' },
          quality: { comment: 'New control comment', commentAdditional: null },
          tags: [{ tagId, name: `Integration Tag ${documentId}`, notes: 'Updated tag notes' }],
          contributors: [{ contributorId, role: 'author', type: 'PRIMARY', notes: 'Updated contributor notes' }],
          publishers: [{ publisherId, notes: 'Updated publisher notes' }],
        },
      })

      expect(result.changed).toBe(true)
      expect(result.changes.map((change) => change.fieldName)).toEqual(
        expect.arrayContaining([
          'dc_title',
          'comment',
          `tag:${tagId}:notes`,
          `contributor:${contributorId}::author`,
          `publisher:${publisherId}`,
        ]),
      )

      await expect(
        tx.document_to_metadata.findFirst({ where: { document_id: documentId, metadata_id: titleMetadata.id } }),
      ).resolves.toMatchObject({ value: JSON.stringify({ value: 'After' }), value_type: 'string' })
      await expect(tx.batches.findUnique({ where: { id: batchId } })).resolves.toMatchObject({
        lifecycle_status: BATCH_LIFECYCLE_STATUSES.PUBLICATION_LOCKED,
      })
      await expect(
        tx.edit_history.count({ where: { entity_table: 'documents', entity_id: documentId } }),
      ).resolves.toBe(5)
    })
  })

  it('rolls back earlier edits when a later relationship is invalid', async () => {
    const documentId = randomUUID()
    const titleMetadata = await db.metadata.findFirst({ where: { name: 'dc_title' }, select: { id: true } })
    if (!titleMetadata) throw new Error('Expected dc_title metadata definition in integration DB')

    await db.documents.create({ data: { id: documentId, name: 'Rollback Fixture' } })
    await db.document_to_metadata.create({
      data: {
        id: randomUUID(),
        document_id: documentId,
        metadata_id: titleMetadata.id,
        value: JSON.stringify({ value: 'Before' }),
        value_type: 'string',
      },
    })

    try {
      await expect(
        applyDocumentEdit({
          documentId,
          editorEmail: 'integration-editor@example.test',
          snapshot: {
            metadata: { dc_title: 'After' },
            quality: { comment: null, commentAdditional: null },
            tags: [],
            contributors: [{ contributorId: randomUUID(), role: 'author', type: null, notes: null }],
            publishers: [],
          },
        }),
      ).rejects.toBeInstanceOf(DocumentEditValidationError)

      await expect(
        db.document_to_metadata.findFirst({ where: { document_id: documentId, metadata_id: titleMetadata.id } }),
      ).resolves.toMatchObject({ value: JSON.stringify({ value: 'Before' }) })
      await expect(db.edit_history.count({ where: { entity_id: documentId } })).resolves.toBe(0)
    } finally {
      await db.documents.delete({ where: { id: documentId } })
    }
  })
})
