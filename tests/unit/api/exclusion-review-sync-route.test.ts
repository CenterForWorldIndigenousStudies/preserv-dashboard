import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetDashboardSession, mockReconcileExclusionReviewBranch } = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockReconcileExclusionReviewBranch: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

vi.mock('@lib/exclusionReviewQueries', () => ({
  reconcileExclusionReviewBranch: mockReconcileExclusionReviewBranch,
}))

import { POST } from '@api/exclusion-review/sync/route'

describe('exclusion review sync route', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('requires a signed-in user', async () => {
    mockGetDashboardSession.mockResolvedValue(null)

    const response = await POST(
      new NextRequest('http://localhost/api/exclusion-review/sync', {
        method: 'POST',
        body: JSON.stringify({ driveId: 'folder-1' }),
        headers: { 'content-type': 'application/json' },
      }),
    )

    expect(response.status).toBe(401)
    expect(mockReconcileExclusionReviewBranch).not.toHaveBeenCalled()
  })

  it('syncs the requested branch for signed-in users', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'viewer@example.org' },
    })
    mockReconcileExclusionReviewBranch.mockResolvedValue({
      driveId: 'folder-1',
      syncedCount: 3,
      updatedNodes: [],
      subtreeIndexStatus: 'complete',
    })

    const response = await POST(
      new NextRequest('http://localhost/api/exclusion-review/sync', {
        method: 'POST',
        body: JSON.stringify({ driveId: 'folder-1' }),
        headers: { 'content-type': 'application/json' },
      }),
    )
    const payload = (await response.json()) as { result?: { syncedCount: number } }

    expect(response.status).toBe(200)
    expect(payload.result?.syncedCount).toBe(3)
    expect(mockReconcileExclusionReviewBranch).toHaveBeenCalledWith('folder-1')
  })
})
