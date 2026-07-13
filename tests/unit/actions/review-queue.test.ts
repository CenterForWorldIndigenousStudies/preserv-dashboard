import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockApplyReviewQueueDecision, mockGetDashboardSession, mockRevalidatePath } = vi.hoisted(() => ({
  mockApplyReviewQueueDecision: vi.fn(),
  mockGetDashboardSession: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@lib/queries', () => ({
  applyReviewQueueDecision: mockApplyReviewQueueDecision,
  getNeedsReviewDocuments: vi.fn(),
  getReviewQueueDocuments: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

import { applyReviewQueueBatchApproveAction } from '@actions/review-queue'
import { REVIEW_QUEUE_PATH } from '@constants/paths'

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
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith(REVIEW_QUEUE_PATH)
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
