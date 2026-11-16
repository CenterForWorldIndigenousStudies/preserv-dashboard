import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetDashboardSession,
  mockGetReprocessingDraft,
  mockGetReprocessingDrafts,
  mockGetOpenDraftForDocument,
  mockGetOpenDraftDocumentIds,
  mockCreateBatchDraft,
  mockAddDocumentsToReprocessingDraft,
  mockUpdateReprocessingDraft,
  mockRemoveDocumentsFromReprocessingDrafts,
  mockRemoveDocumentFromReprocessingDraft,
  mockArchiveReprocessingDraft,
  mockGetPipelineExecutionSnapshot,
  mockTriggerMetadataExtractor,
  mockTriggerDataIngesterReprocess,
  mockRevalidatePath,
  mockFindCollectionByCanonicalName,
  mockCreateCollection,
} = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockGetReprocessingDraft: vi.fn(),
  mockGetReprocessingDrafts: vi.fn(),
  mockGetOpenDraftForDocument: vi.fn(),
  mockGetOpenDraftDocumentIds: vi.fn(),
  mockCreateBatchDraft: vi.fn(),
  mockAddDocumentsToReprocessingDraft: vi.fn(),
  mockUpdateReprocessingDraft: vi.fn(),
  mockRemoveDocumentsFromReprocessingDrafts: vi.fn(),
  mockRemoveDocumentFromReprocessingDraft: vi.fn(),
  mockArchiveReprocessingDraft: vi.fn(),
  mockGetPipelineExecutionSnapshot: vi.fn(),
  mockTriggerMetadataExtractor: vi.fn(),
  mockTriggerDataIngesterReprocess: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockFindCollectionByCanonicalName: vi.fn(),
  mockCreateCollection: vi.fn(),
}))

vi.mock('@root/auth', () => ({ getDashboardSession: mockGetDashboardSession }))
vi.mock('@lib/queries/reprocessingDraftQueries', () => ({
  getReprocessingDraft: mockGetReprocessingDraft,
  getReprocessingDrafts: mockGetReprocessingDrafts,
  getOpenDraftForDocument: mockGetOpenDraftForDocument,
  getOpenDraftDocumentIds: mockGetOpenDraftDocumentIds,
  createBatchDraft: mockCreateBatchDraft,
  addDocumentsToReprocessingDraft: mockAddDocumentsToReprocessingDraft,
  updateReprocessingDraft: mockUpdateReprocessingDraft,
  removeDocumentsFromReprocessingDrafts: mockRemoveDocumentsFromReprocessingDrafts,
  removeDocumentFromReprocessingDraft: mockRemoveDocumentFromReprocessingDraft,
  archiveReprocessingDraft: mockArchiveReprocessingDraft,
}))
vi.mock('@lib/queries/pipelineExecutionQueries', () => ({
  batchNameExists: vi.fn(),
  documentIdsExist: vi.fn(),
  getPipelineExecutionSnapshot: mockGetPipelineExecutionSnapshot,
}))
vi.mock('@lib/pipelineTriggerRequests', () => ({
  triggerContentDedup: vi.fn(),
  triggerDocumentSplitter: vi.fn(),
  triggerFedoraIngester: vi.fn(),
  triggerMetadataExtractor: mockTriggerMetadataExtractor,
  triggerDataIngesterReprocess: mockTriggerDataIngesterReprocess,
  triggerOcrProcessor: vi.fn(),
  triggerPageRotator: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@lib/queries/collectionQueries', () => ({
  findCollectionByCanonicalName: mockFindCollectionByCanonicalName,
  createCollection: mockCreateCollection,
}))

import { requestPipelineExecution } from '@actions/pipelineExecution'

describe('requestPipelineExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'reviewer@example.com' } })
    mockFindCollectionByCanonicalName.mockResolvedValue(null)
  })

  it('reaches the stable draft execution key when a submitted draft is retried', async () => {
    mockGetReprocessingDraft.mockResolvedValue(null)
    mockGetPipelineExecutionSnapshot.mockResolvedValue({
      batch: {
        batchId: 'draft-1',
        lifecycleStatus: 'queued',
        currentExecution: {
          executionMode: 'reprocess',
          operationId: 'draft-submit:draft-1',
          idempotencyKey: 'draft-submit:draft-1',
          stage: 'metadata_extractor',
        },
      },
      currentExecution: {
        executionMode: 'reprocess',
        operationId: 'draft-submit:draft-1',
        idempotencyKey: 'draft-submit:draft-1',
        stage: 'metadata_extractor',
        reason: 'Retry metadata',
        sourceDocumentIds: ['doc-1'],
      },
      queueAttempts: [],
      batchNameConflict: false,
    })
    mockTriggerDataIngesterReprocess.mockResolvedValue({ batchId: 'draft-1' })

    await expect(
      requestPipelineExecution({
        mode: 'reprocess',
        batchId: 'draft-1',
        draftBatchId: 'draft-1',
        restartStage: 'metadata_extractor',
        reason: 'Retry metadata',
      }),
    ).resolves.toMatchObject({ ok: true, operationId: 'draft-submit:draft-1' })

    expect(mockTriggerDataIngesterReprocess).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 'draft-1' }),
      expect.objectContaining({
        operationId: 'draft-submit:draft-1',
        idempotencyKey: 'draft-submit:draft-1',
        draftBatchId: 'draft-1',
      }),
    )
  })

  it('keeps direct reprocessing on the existing stage path', async () => {
    mockGetReprocessingDraft.mockResolvedValue(null)
    mockGetPipelineExecutionSnapshot.mockResolvedValue({
      batch: null,
      currentExecution: null,
      queueAttempts: [],
      batchNameConflict: false,
    })
    const queryModule = await import('@lib/queries/pipelineExecutionQueries')
    vi.mocked(queryModule.documentIdsExist).mockResolvedValue(true)
    vi.mocked(queryModule.batchNameExists).mockResolvedValue(false)
    mockTriggerMetadataExtractor.mockResolvedValue({ batchId: 'new-batch-1' })

    await expect(
      requestPipelineExecution({
        mode: 'reprocess',
        restartStage: 'metadata_extractor',
        documentIds: ['doc-1'],
        newBatchName: 'Reprocessed batch',
        reason: 'Retry metadata',
      }),
    ).resolves.toMatchObject({ ok: true })

    expect(mockTriggerMetadataExtractor).toHaveBeenCalledWith(
      expect.objectContaining({ batchName: 'Reprocessed batch' }),
      expect.objectContaining({
        executionMode: 'reprocess',
        sourceDocumentIds: ['doc-1'],
      }),
    )
    expect(mockTriggerDataIngesterReprocess).not.toHaveBeenCalled()
  })

  it('asks for a decision when a proposed collection name was claimed before Process batch', async () => {
    mockGetReprocessingDraft.mockResolvedValue({
      id: 'draft-1',
      name: 'Batch',
      restartStage: 'metadata_extractor',
      requestedStages: ['metadata_extractor'],
      documentCount: 1,
      documents: [{ id: 'doc-1' }],
      collectionName: 'Culture',
      collectionProposal: {
        name: 'Culture',
        notes: 'Draft notes',
        tagNotes: null,
        qualifierNames: ['History'],
        fedoraNodeId: '50',
      },
    })
    mockGetPipelineExecutionSnapshot.mockResolvedValue({ batch: { batchId: 'draft-1' }, currentExecution: null })
    mockFindCollectionByCanonicalName.mockResolvedValue({
      id: 'existing-1',
      name: 'Culture',
      notes: 'Existing notes',
      libraryId: '51',
      qualifiers: ['Art'],
    })

    const request = {
      mode: 'reprocess' as const,
      batchId: 'draft-1',
      draftBatchId: 'draft-1',
      restartStage: 'metadata_extractor' as const,
      requestedStages: ['metadata_extractor' as const],
      reason: 'Process',
    }
    await expect(requestPipelineExecution(request)).resolves.toMatchObject({
      ok: false,
      collectionConflict: { draftName: 'Culture', existingId: 'existing-1', existingLibraryId: '51' },
    })
    expect(mockCreateCollection).not.toHaveBeenCalled()

    mockTriggerDataIngesterReprocess.mockResolvedValue({ batchId: 'draft-1' })
    await expect(
      requestPipelineExecution({
        ...request,
        collectionResolution: { kind: 'use_existing', collectionId: 'existing-1' },
      }),
    ).resolves.toMatchObject({ ok: true })
    expect(mockCreateCollection).not.toHaveBeenCalled()
    expect(mockTriggerDataIngesterReprocess).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ collection: { name: 'Culture', notes: 'Existing notes' } }),
    )
  })

  it('creates a proposed collection with a unique replacement name when selected', async () => {
    mockGetReprocessingDraft.mockResolvedValue({
      id: 'draft-1',
      name: 'Batch',
      restartStage: 'metadata_extractor',
      requestedStages: ['metadata_extractor'],
      documentCount: 1,
      documents: [{ id: 'doc-1' }],
      collectionName: 'Culture',
      collectionProposal: {
        name: 'Culture',
        notes: 'Draft notes',
        tagNotes: 'Tag notes',
        qualifierNames: ['History'],
        fedoraNodeId: '50',
      },
    })
    mockGetPipelineExecutionSnapshot.mockResolvedValue({ batch: { batchId: 'draft-1' }, currentExecution: null })
    mockFindCollectionByCanonicalName.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'Culture' ? { id: 'existing-1', name: 'Culture', notes: null, libraryId: null, qualifiers: [] } : null,
      ),
    )
    mockCreateCollection.mockResolvedValue({ collection: { collection_name: 'Culture Archive', notes: 'Draft notes' } })
    mockTriggerDataIngesterReprocess.mockResolvedValue({ batchId: 'draft-1' })

    await expect(
      requestPipelineExecution({
        mode: 'reprocess',
        batchId: 'draft-1',
        draftBatchId: 'draft-1',
        restartStage: 'metadata_extractor',
        requestedStages: ['metadata_extractor'],
        reason: 'Process',
        collectionResolution: { kind: 'use_proposal', name: 'Culture Archive' },
      }),
    ).resolves.toMatchObject({ ok: true })
    expect(mockCreateCollection).toHaveBeenCalledWith({
      tagName: 'Culture Archive',
      tagNotes: 'Tag notes',
      qualifierTagNames: ['History'],
      collectionNotes: 'Draft notes',
      fedoraNodeId: '50',
    })
  })
})
