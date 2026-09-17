import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetDashboardSession,
  mockGetReprocessingDraft,
  mockGetPipelineExecutionSnapshot,
  mockTriggerMetadataExtractor,
  mockTriggerDataIngesterReprocess,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockGetReprocessingDraft: vi.fn(),
  mockGetPipelineExecutionSnapshot: vi.fn(),
  mockTriggerMetadataExtractor: vi.fn(),
  mockTriggerDataIngesterReprocess: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@root/auth', () => ({ getDashboardSession: mockGetDashboardSession }))
vi.mock('@lib/queries/reprocessingDraftQueries', () => ({ getReprocessingDraft: mockGetReprocessingDraft }))
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

import { requestPipelineExecution } from '@actions/pipelineExecution'

describe('requestPipelineExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'reviewer@example.com' } })
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

    await expect(requestPipelineExecution({
      mode: 'reprocess',
      batchId: 'draft-1',
      draftBatchId: 'draft-1',
      restartStage: 'metadata_extractor',
      reason: 'Retry metadata',
    })).resolves.toMatchObject({ ok: true, operationId: 'draft-submit:draft-1' })

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

    await expect(requestPipelineExecution({
      mode: 'reprocess',
      restartStage: 'metadata_extractor',
      documentIds: ['doc-1'],
      newBatchName: 'Reprocessed batch',
      reason: 'Retry metadata',
    })).resolves.toMatchObject({ ok: true })

    expect(mockTriggerMetadataExtractor).toHaveBeenCalledWith(
      expect.objectContaining({ batchName: 'Reprocessed batch' }),
      expect.objectContaining({
        executionMode: 'reprocess',
        sourceDocumentIds: ['doc-1'],
      }),
    )
    expect(mockTriggerDataIngesterReprocess).not.toHaveBeenCalled()
  })
})
