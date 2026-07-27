import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  mockApplyExclusionReviewDecision,
  mockGetDashboardSession,
  mockReconcileExclusionReviewBranch,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockApplyExclusionReviewDecision: vi.fn(),
  mockGetDashboardSession: vi.fn(),
  mockReconcileExclusionReviewBranch: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@lib/exclusionReviewQueries', () => ({
  applyExclusionReviewDecision: mockApplyExclusionReviewDecision,
  loadExclusionReviewChildren: vi.fn(),
  loadExclusionReviewRootTree: vi.fn(),
  reconcileExclusionReviewBranch: mockReconcileExclusionReviewBranch,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

import {
  applyExclusionReviewDecisionAction,
  syncExclusionReviewBranchAction,
} from '@actions/exclusion-review'

describe('exclusion review actions', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns a clear success message when a decision is removed', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'editor@example.org' },
    })
    mockApplyExclusionReviewDecision.mockResolvedValue({
      updatedAt: '2026-07-17T12:00:00.000Z',
      updatedNodes: [],
    })

    const result = await applyExclusionReviewDecisionAction('file-1', null)

    expect(result).toEqual({
      ok: true,
      message: 'Review cleared.',
    })
    expect(mockApplyExclusionReviewDecision).toHaveBeenCalledWith({
      driveId: 'file-1',
      decision: null,
      reviewerEmail: 'editor@example.org',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/exclusion-review')
  })

  it('returns an auth error when sync is requested without a session', async () => {
    mockGetDashboardSession.mockResolvedValue(null)

    const result = await syncExclusionReviewBranchAction('folder-1')

    expect(result).toEqual({
      ok: false,
      error: 'Authentication required.',
    })
    expect(mockReconcileExclusionReviewBranch).not.toHaveBeenCalled()
  })
})
