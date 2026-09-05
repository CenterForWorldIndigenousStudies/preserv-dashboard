import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockApplyReviewQueueDecision, mockGetDashboardSession, mockRevalidatePath, mockUpdateReviewQueueChecklist } =
  vi.hoisted(() => ({
    mockApplyReviewQueueDecision: vi.fn(),
    mockGetDashboardSession: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockUpdateReviewQueueChecklist: vi.fn(),
  }))

vi.mock('@lib/queries/queries', () => ({
  applyReviewQueueDecision: mockApplyReviewQueueDecision,
  getNeedsReviewDocuments: vi.fn(),
  getReviewQueueDocuments: vi.fn(),
  updateReviewQueueChecklist: mockUpdateReviewQueueChecklist,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

import {
  applyReviewQueueBatchApproveAction,
  applyReviewQueueBatchDecisionAction,
  updateReviewQueueChecklistAction,
} from '@actions/review-queue'
import { LIBRARY_PATH, READY_FOR_LIBRARY_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'

describe('applyReviewQueueBatchApproveAction', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('reuses the individual approve flow for each selected document and reports partial failures', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1747094400123)
    mockGetDashboardSession.mockResolvedValue({
      user: { name: '  Maria Reviewer  ' },
    })
    mockApplyReviewQueueDecision.mockImplementation(({ documentId }: { documentId: string }) => {
      if (documentId === 'doc-2') {
        throw new Error('Document 2 could not be approved.')
      }
    })

    const result = await applyReviewQueueBatchApproveAction([' doc-1 ', 'doc-2', 'doc-1', '   '])

    expect(result).toEqual({
      ok: true,
      approvedIds: ['doc-1'],
      failed: [{ documentId: 'doc-2', error: 'Document 2 could not be approved.' }],
      message: '1 documents approved. 1 failed.',
    })
    expect(mockApplyReviewQueueDecision).toHaveBeenCalledTimes(2)
    expect(mockApplyReviewQueueDecision).toHaveBeenNthCalledWith(1, {
      documentId: 'doc-1',
      decision: 'APPROVED',
      validationTimestamp: 1747094400,
      validatorName: 'Maria Reviewer',
    })
    expect(mockApplyReviewQueueDecision).toHaveBeenNthCalledWith(2, {
      documentId: 'doc-2',
      decision: 'APPROVED',
      validationTimestamp: 1747094400,
      validatorName: 'Maria Reviewer',
    })
    expect(mockRevalidatePath).toHaveBeenCalledTimes(3)
    expect(mockRevalidatePath).toHaveBeenNthCalledWith(1, REVIEW_QUEUE_PATH)
    expect(mockRevalidatePath).toHaveBeenNthCalledWith(2, READY_FOR_LIBRARY_PATH)
    expect(mockRevalidatePath).toHaveBeenNthCalledWith(3, LIBRARY_PATH)
  })

  it('rejects empty selections before invoking the approve flow', async () => {
    const result = await applyReviewQueueBatchApproveAction(['   '])

    expect(result).toEqual({
      ok: false,
      approvedIds: [],
      failed: [],
      error: 'Select at least one document to approve.',
    })
    expect(mockApplyReviewQueueDecision).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockGetDashboardSession).not.toHaveBeenCalled()
  })
})

describe('applyReviewQueueBatchDecisionAction', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('applies a rejection to each selected document and reports partial failures', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { name: 'Maria Reviewer' } })
    mockApplyReviewQueueDecision.mockImplementation(({ documentId }: { documentId: string }) => {
      if (documentId === 'doc-2') {
        throw new Error('Document 2 could not be rejected.')
      }
    })

    await expect(applyReviewQueueBatchDecisionAction(['doc-1', 'doc-2'], 'REJECTED')).resolves.toEqual({
      ok: true,
      processedIds: ['doc-1'],
      failed: [{ documentId: 'doc-2', error: 'Document 2 could not be rejected.' }],
      message: '1 documents rejected. 1 failed.',
    })
  })
})

describe('updateReviewQueueChecklistAction', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('updates the checklist and revalidates the review queue', async () => {
    const checklist = {
      metadataReviewed: true,
      rightsReviewed: false,
      classificationReviewed: false,
      duplicatesChecked: false,
      completenessReviewed: false,
    }
    mockUpdateReviewQueueChecklist.mockResolvedValue(checklist)

    await expect(updateReviewQueueChecklistAction(' doc-1 ', 'metadataReviewed', true)).resolves.toEqual({
      ok: true,
      checklist,
    })

    expect(mockUpdateReviewQueueChecklist).toHaveBeenCalledWith({
      documentId: 'doc-1',
      itemKey: 'metadataReviewed',
      completed: true,
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith(REVIEW_QUEUE_PATH)
  })

  it('returns a user-facing error when the checklist cannot be saved', async () => {
    mockUpdateReviewQueueChecklist.mockRejectedValue(new Error('Checklist could not be saved.'))

    await expect(updateReviewQueueChecklistAction('doc-1', 'rightsReviewed', false)).resolves.toEqual({
      ok: false,
      error: 'Checklist could not be saved.',
    })
  })
})
