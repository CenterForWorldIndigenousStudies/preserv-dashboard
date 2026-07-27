import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockApplyExclusionReviewDecision,
  mockGetDashboardSession,
  mockGetExclusionReviewConfig,
} = vi.hoisted(() => ({
  mockApplyExclusionReviewDecision: vi.fn(),
  mockGetDashboardSession: vi.fn(),
  mockGetExclusionReviewConfig: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

vi.mock('@lib/exclusionReviewConfig', () => ({
  getExclusionReviewConfig: mockGetExclusionReviewConfig,
}))

vi.mock('@lib/exclusionReviewQueries', () => ({
  applyExclusionReviewDecision: mockApplyExclusionReviewDecision,
}))

import { POST } from '@api/exclusion-review/decision/route'

describe('exclusion review decision route', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects decision writes from non-allowlisted users', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'viewer@example.org' },
    })
    mockGetExclusionReviewConfig.mockReturnValue({
      rootFolderId: 'root-folder',
      allowedEditorEmails: ['editor@example.org'],
      childPageSize: 200,
    })

    const response = await POST(
      new NextRequest('http://localhost/api/exclusion-review/decision', {
        method: 'POST',
        body: JSON.stringify({ driveId: 'file-1', decision: 'exclude' }),
        headers: { 'content-type': 'application/json' },
      }),
    )
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(403)
    expect(payload.error).toBe(
      'You do not have permission to edit exclusion review.',
    )
    expect(mockApplyExclusionReviewDecision).not.toHaveBeenCalled()
  })

  it('saves an allowlisted reviewer decision', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'editor@example.org' },
    })
    mockGetExclusionReviewConfig.mockReturnValue({
      rootFolderId: 'root-folder',
      allowedEditorEmails: ['editor@example.org'],
      childPageSize: 200,
    })
    mockApplyExclusionReviewDecision.mockResolvedValue({
      updatedAt: '2026-07-17T12:00:00.000Z',
      updatedNodes: [],
    })

    const response = await POST(
      new NextRequest('http://localhost/api/exclusion-review/decision', {
        method: 'POST',
        body: JSON.stringify({ driveId: 'file-1', decision: 'exclude' }),
        headers: { 'content-type': 'application/json' },
      }),
    )

    expect(response.status).toBe(200)
    expect(mockApplyExclusionReviewDecision).toHaveBeenCalledWith({
      driveId: 'file-1',
      decision: 'exclude',
      reviewerEmail: 'editor@example.org',
    })
  })
})
