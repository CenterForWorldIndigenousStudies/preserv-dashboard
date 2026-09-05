import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@root/auth', () => ({
  getDashboardSession: vi.fn().mockResolvedValue({ user: { email: 'integration@example.test' } }),
}))

import { db } from '@lib/db'
import {
  addDocumentToReprocessingDraft,
  archiveReprocessingDraft,
  createReprocessingDraft,
  getOpenDraftForDocument,
  getReprocessingDraft,
  getReprocessingDrafts,
  removeDocumentFromReprocessingDraft,
} from '@lib/queries/reprocessingDraftQueries'
import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('reprocessing draft queries (integration)', () => {
  const documentIds: string[] = []
  const batchIds: string[] = []

  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
  })

  afterAll(async () => {
    if (batchIds.length > 0) await db.batches.deleteMany({ where: { id: { in: batchIds } } })
    if (documentIds.length > 0) await db.documents.deleteMany({ where: { id: { in: documentIds } } })
    await db.$disconnect()
  })

  it('keeps draft membership transactional and archives the cart batch', async () => {
    const documentOneId = crypto.randomUUID()
    const documentTwoId = crypto.randomUUID()
    documentIds.push(documentOneId, documentTwoId)
    await db.documents.createMany({
      data: [
        { id: documentOneId, name: 'Draft source one', filesize: BigInt(1) },
        { id: documentTwoId, name: 'Draft source two', filesize: BigInt(1) },
      ],
    })

    const created = await createReprocessingDraft({
      documentId: documentOneId,
      name: `Integration draft ${Date.now()}`,
      restartStage: 'metadata_extractor',
      reason: 'Integration test reprocessing.',
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    batchIds.push(created.batchId)

    expect((await getOpenDraftForDocument(documentOneId))?.id).toBe(created.batchId)
    expect((await addDocumentToReprocessingDraft({ batchId: created.batchId, documentId: documentTwoId })).ok).toBe(true)
    expect((await getReprocessingDraft(created.batchId))?.documents).toHaveLength(2)

    expect((await removeDocumentFromReprocessingDraft(created.batchId, documentTwoId)).ok).toBe(true)
    expect(await getOpenDraftForDocument(documentTwoId)).toBeNull()
    expect((await archiveReprocessingDraft(created.batchId)).ok).toBe(true)
    expect((await getReprocessingDrafts()).some((draft) => draft.id === created.batchId)).toBe(false)
  })
})
