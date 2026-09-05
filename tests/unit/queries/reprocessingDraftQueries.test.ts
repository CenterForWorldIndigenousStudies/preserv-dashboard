import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb, mockCreateEditHistoryEntry } = vi.hoisted(() => ({
  mockDb: {
    batches: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    documents: { findUnique: vi.fn() },
    document_to_batches: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  mockCreateEditHistoryEntry: vi.fn(),
}))

vi.mock('@lib/db', () => ({ db: mockDb }))
vi.mock('@lib/editHistory', () => ({ createEditHistoryEntry: mockCreateEditHistoryEntry }))

import {
  addDocumentToReprocessingDraft,
  addDocumentsToReprocessingDraft,
  createReprocessingDraft,
  createReprocessingDraftForDocuments,
  getOpenDraftForDocument,
  getOpenDraftDocumentIds,
  getReprocessingDrafts,
  removeDocumentsFromReprocessingDrafts,
  removeDocumentFromReprocessingDraft,
  updateReprocessingDraft,
} from '@lib/queries/reprocessingDraftQueries'

describe('reprocessing draft queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.document_to_batches.findFirst.mockResolvedValue(null)
    mockDb.document_to_batches.findMany.mockResolvedValue([])
    mockDb.$transaction.mockImplementation((callback: (tx: typeof mockDb) => unknown) => callback(mockDb))
  })

  it('lists only draft batches and maps stored draft metadata', async () => {
    mockDb.batches.findMany.mockResolvedValue([
      {
        id: 'draft-1',
        name: 'Review retry one',
        lifecycle_status: 'draft',
        processing_details: JSON.stringify({
          reprocessing_draft: {
            restart_stage: 'ocr_processor',
            reason: 'Low OCR confidence',
            collection_name: 'Collection A',
            collection_notes: 'Review set',
            created_by: 'reviewer@example.com',
            updated_by: 'reviewer@example.com',
          },
        }),
        created_at: new Date('2026-09-03T10:00:00.000Z'),
        updated_at: new Date('2026-09-03T10:05:00.000Z'),
        document_to_batches: [{ document_id: 'doc-1' }, { document_id: 'doc-2' }],
      },
    ])

    await expect(getReprocessingDrafts()).resolves.toEqual([
      {
        id: 'draft-1',
        name: 'Review retry one',
        collectionName: 'Collection A',
        collectionNotes: 'Review set',
        restartStage: 'ocr_processor',
        reason: 'Low OCR confidence',
        documentCount: 2,
        createdAt: '2026-09-03T10:00:00.000Z',
        updatedAt: '2026-09-03T10:05:00.000Z',
        createdBy: 'reviewer@example.com',
        updatedBy: 'reviewer@example.com',
      },
    ])
    expect(mockDb.batches.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lifecycle_status: 'draft' } }),
    )
  })

  it('returns the open draft owning a document', async () => {
    mockDb.document_to_batches.findFirst.mockResolvedValue({
      batches: {
        id: 'draft-1',
        name: 'Retry batch',
        lifecycle_status: 'draft',
        processing_details: JSON.stringify({ reprocessing_draft: { restart_stage: 'page_rotator', reason: 'Retry' } }),
        created_at: new Date('2026-09-03T10:00:00.000Z'),
        updated_at: new Date('2026-09-03T10:00:00.000Z'),
        document_to_batches: [{ document_id: 'doc-1' }],
      },
    })

    await expect(getOpenDraftForDocument('doc-1')).resolves.toMatchObject({ id: 'draft-1', documentCount: 1 })
    expect(mockDb.document_to_batches.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { document_id: 'doc-1', batches: { lifecycle_status: 'draft' } } }),
    )
  })

  it('creates a draft and its document membership in one transaction', async () => {
    mockDb.documents.findUnique.mockResolvedValue({ id: 'doc-1' })
    mockDb.batches.findFirst.mockResolvedValue(null)
    mockDb.batches.create.mockResolvedValue({ id: 'draft-1' })
    mockDb.document_to_batches.create.mockResolvedValue({ id: 'membership-1' })

    const result = await createReprocessingDraft({
      documentId: 'doc-1',
      name: 'Retry batch',
      restartStage: 'ocr_processor',
      reason: 'Low OCR confidence',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.batchId).toMatch(/^[0-9a-f-]{36}$/)
    const createCall = mockDb.batches.create.mock.calls[0] as unknown as [
      { data: { id: string; lifecycle_status: string; name: string; processing_details: string } },
    ]
    expect(createCall[0].data.lifecycle_status).toBe('draft')
    expect(createCall[0].data.name).toBe('Retry batch')
    expect(createCall[0].data.processing_details).toContain('ocr_processor')

    const membershipCall = mockDb.document_to_batches.create.mock.calls[0] as unknown as [
      { data: { document_id: string; batch_id: string } },
    ]
    expect(membershipCall[0].data.document_id).toBe('doc-1')
    expect(membershipCall[0].data.batch_id).toBe(result.batchId)
  })

  it('creates one draft with all selected document memberships in one transaction', async () => {
    mockDb.documents.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id }),
    )
    mockDb.batches.findFirst.mockResolvedValue(null)
    mockDb.batches.create.mockResolvedValue({ id: 'draft-1' })
    mockDb.document_to_batches.create.mockImplementation(({ data }: { data: { id: string } }) =>
      Promise.resolve({ id: data.id }),
    )

    const result = await createReprocessingDraftForDocuments({
      documentIds: ['doc-1', 'doc-2'],
      name: 'Retry selected documents',
      restartStage: 'ocr_processor',
      reason: 'Low OCR confidence',
    })

    expect(result.ok).toBe(true)
    expect(mockDb.documents.findUnique).toHaveBeenCalledTimes(2)
    expect(mockDb.document_to_batches.create).toHaveBeenCalledTimes(2)
    const membershipCalls = mockDb.document_to_batches.create.mock.calls as unknown as Array<
      [{ data: { document_id: string } }]
    >
    expect(membershipCalls.map(([call]) => call.data.document_id)).toEqual(['doc-1', 'doc-2'])
  })

  it('records the previous and new values when a draft is updated', async () => {
    mockDb.batches.findFirst.mockResolvedValueOnce({
      id: 'draft-1',
      name: 'Old name',
      processing_details: JSON.stringify({
        reprocessing_draft: {
          restart_stage: 'ocr_processor',
          reason: 'Old reason',
          collection_name: 'Old collection',
          collection_notes: 'Old notes',
          created_by: 'creator@example.com',
        },
      }),
      created_at: new Date('2026-09-03T10:00:00.000Z'),
      updated_at: new Date('2026-09-03T10:00:00.000Z'),
      document_to_batches: [{ document_id: 'doc-1' }],
    })
    mockDb.batches.findFirst.mockResolvedValueOnce(null)

    const result = await updateReprocessingDraft({
      batchId: 'draft-1',
      name: 'New name',
      collectionName: 'New collection',
      collectionNotes: 'New notes',
      reason: 'New reason',
      updatedBy: 'editor@example.com',
    })

    expect(result).toEqual({ ok: true, batchId: 'draft-1' })
    expect(mockCreateEditHistoryEntry).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        entityTable: 'batches',
        entityId: 'draft-1',
        previousValue: expect.objectContaining({ name: 'Old name', reason: 'Old reason' }) as unknown as Record<
          string,
          unknown
        >,
        newValue: expect.objectContaining({ name: 'New name', reason: 'New reason' }) as unknown as Record<
          string,
          unknown
        >,
      }),
    )
  })

  it('records a newly added draft membership in edit history', async () => {
    mockDb.batches.findFirst.mockResolvedValue({ id: 'draft-1', processing_details: '{}', document_to_batches: [] })
    mockDb.documents.findUnique.mockResolvedValue({ id: 'doc-1' })
    mockDb.document_to_batches.findFirst.mockResolvedValue(null)
    mockDb.document_to_batches.create.mockResolvedValue({
      id: 'membership-1',
      batch_id: 'draft-1',
      document_id: 'doc-1',
    })

    const result = await addDocumentToReprocessingDraft({ batchId: 'draft-1', documentId: 'doc-1' })

    expect(result).toEqual({ ok: true, batchId: 'draft-1' })
    expect(mockCreateEditHistoryEntry).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        entityTable: 'document_to_batches',
        entityId: 'membership-1',
        previousValue: null,
        newValue: expect.objectContaining({ batch_id: 'draft-1', document_id: 'doc-1' }) as unknown as Record<
          string,
          unknown
        >,
      }),
    )
  })

  it('moves selected documents from another open draft into the target draft', async () => {
    mockDb.batches.findFirst.mockResolvedValue({ id: 'draft-1', processing_details: '{}', document_to_batches: [] })
    mockDb.documents.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id }),
    )
    mockDb.document_to_batches.findMany.mockResolvedValue([
      { id: 'old-membership', batch_id: 'other-draft', document_id: 'doc-2' },
    ])
    mockDb.document_to_batches.findFirst.mockResolvedValue(null)
    mockDb.document_to_batches.create.mockResolvedValue({ id: 'new-membership', batch_id: 'draft-1' })

    await expect(addDocumentsToReprocessingDraft({ batchId: 'draft-1', documentIds: ['doc-1', 'doc-2'] })).resolves.toEqual(
      { ok: true, batchId: 'draft-1' },
    )
    expect(mockDb.document_to_batches.delete).toHaveBeenCalledWith({ where: { id: 'old-membership' } })
    expect(mockDb.document_to_batches.create).toHaveBeenCalledTimes(2)
  })

  it('removes only open-draft memberships for selected documents', async () => {
    mockDb.document_to_batches.findMany.mockResolvedValue([
      { id: 'draft-membership', batch_id: 'draft-1', document_id: 'doc-1' },
    ])

    await expect(removeDocumentsFromReprocessingDrafts(['doc-1', 'doc-2'])).resolves.toEqual({
      ok: true,
      removedDocumentIds: ['doc-1'],
    })
    expect(mockDb.document_to_batches.delete).toHaveBeenCalledWith({ where: { id: 'draft-membership' } })
    const membershipQuery = mockDb.document_to_batches.findMany.mock.calls[0]?.[0] as unknown
    expect(membershipQuery).toMatchObject({ where: { batches: { lifecycle_status: 'draft' } } })
  })

  it('returns selected document IDs that belong to an open draft', async () => {
    mockDb.document_to_batches.findMany.mockResolvedValue([
      { document_id: 'doc-1' },
      { document_id: 'doc-1' },
    ])

    await expect(getOpenDraftDocumentIds(['doc-1', 'doc-2'])).resolves.toEqual(['doc-1'])
  })

  it('records a removed draft membership in edit history', async () => {
    mockDb.batches.findFirst.mockResolvedValue({ id: 'draft-1', processing_details: '{}', document_to_batches: [] })
    mockDb.document_to_batches.findFirst.mockResolvedValue({
      id: 'membership-1',
      batch_id: 'draft-1',
      document_id: 'doc-1',
    })

    const result = await removeDocumentFromReprocessingDraft('draft-1', 'doc-1')

    expect(result).toEqual({ ok: true, batchId: 'draft-1' })
    expect(mockCreateEditHistoryEntry).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        entityTable: 'document_to_batches',
        entityId: 'membership-1',
        previousValue: expect.objectContaining({ batch_id: 'draft-1', document_id: 'doc-1' }) as unknown as Record<
          string,
          unknown
        >,
        newValue: null,
      }),
    )
  })
})
