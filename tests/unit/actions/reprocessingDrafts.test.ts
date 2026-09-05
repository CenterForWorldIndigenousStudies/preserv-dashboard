import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetDashboardSession,
  mockCreateReprocessingDraft,
  mockCreateReprocessingDraftForDocuments,
  mockGetOpenDraftDocumentIds,
  mockRemoveDocumentsFromReprocessingDrafts,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockCreateReprocessingDraft: vi.fn(),
  mockCreateReprocessingDraftForDocuments: vi.fn(),
  mockGetOpenDraftDocumentIds: vi.fn(),
  mockRemoveDocumentsFromReprocessingDrafts: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@root/auth', () => ({ getDashboardSession: mockGetDashboardSession }))
vi.mock('@lib/queries/reprocessingDraftQueries', () => ({
  createReprocessingDraft: mockCreateReprocessingDraft,
  createReprocessingDraftForDocuments: mockCreateReprocessingDraftForDocuments,
  getOpenDraftDocumentIds: mockGetOpenDraftDocumentIds,
  removeDocumentsFromReprocessingDrafts: mockRemoveDocumentsFromReprocessingDrafts,
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import {
  createReprocessingDraftAction,
  createReprocessingDraftForDocumentsAction,
  getOpenDraftDocumentIdsAction,
  removeDocumentsFromReprocessingDraftsAction,
} from '@actions/reprocessingDrafts'
import { REVIEW_QUEUE_PATH } from '@constants/paths'

describe('reprocessing draft actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication and normalizes the create input', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'reviewer@example.com' } })
    mockCreateReprocessingDraft.mockResolvedValue({ ok: true, batchId: 'draft-1' })

    await expect(
      createReprocessingDraftAction({
        documentId: ' doc-1 ',
        name: ' Retry batch ',
        restartStage: 'ocr_processor',
        reason: ' Low OCR confidence ',
      }),
    ).resolves.toEqual({ ok: true, batchId: 'draft-1' })
    expect(mockCreateReprocessingDraft).toHaveBeenCalledWith({
      documentId: 'doc-1',
      name: 'Retry batch',
      restartStage: 'ocr_processor',
      reason: 'Low OCR confidence',
      createdBy: 'reviewer@example.com',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith(REVIEW_QUEUE_PATH)
  })

  it('rejects unauthenticated callers before touching the query layer', async () => {
    mockGetDashboardSession.mockResolvedValue(null)

    await expect(
      createReprocessingDraftAction({
        documentId: 'doc-1',
        name: 'Retry',
        restartStage: 'ocr_processor',
        reason: 'Retry',
      }),
    ).resolves.toEqual({ ok: false, error: 'Authentication required.' })
    expect(mockCreateReprocessingDraft).not.toHaveBeenCalled()
  })

  it('normalizes and authenticates a multi-document draft creation request', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'reviewer@example.com' } })
    mockCreateReprocessingDraftForDocuments.mockResolvedValue({ ok: true, batchId: 'draft-1' })

    await expect(
      createReprocessingDraftForDocumentsAction({
        documentIds: [' doc-1 ', 'doc-2'],
        name: ' Retry batch ',
        restartStage: 'ocr_processor',
        reason: ' Low OCR confidence ',
      }),
    ).resolves.toEqual({ ok: true, batchId: 'draft-1' })

    expect(mockCreateReprocessingDraftForDocuments).toHaveBeenCalledWith({
      documentIds: ['doc-1', 'doc-2'],
      name: 'Retry batch',
      restartStage: 'ocr_processor',
      reason: 'Low OCR confidence',
      createdBy: 'reviewer@example.com',
    })
  })

  it('returns open-draft membership for authenticated selected documents', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'reviewer@example.com' } })
    mockGetOpenDraftDocumentIds.mockResolvedValue(['doc-1'])

    await expect(getOpenDraftDocumentIdsAction([' doc-1 ', 'doc-2'])).resolves.toEqual(['doc-1'])
    expect(mockGetOpenDraftDocumentIds).toHaveBeenCalledWith(['doc-1', 'doc-2'])
  })

  it('removes draft memberships for authenticated selected documents', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'reviewer@example.com' } })
    mockRemoveDocumentsFromReprocessingDrafts.mockResolvedValue({ ok: true, removedDocumentIds: ['doc-1'] })

    await expect(removeDocumentsFromReprocessingDraftsAction([' doc-1 ', 'doc-2'])).resolves.toEqual({
      ok: true,
      removedDocumentIds: ['doc-1'],
    })
    expect(mockRemoveDocumentsFromReprocessingDrafts).toHaveBeenCalledWith(['doc-1', 'doc-2'])
    expect(mockRevalidatePath).toHaveBeenCalledWith(REVIEW_QUEUE_PATH)
  })
})
