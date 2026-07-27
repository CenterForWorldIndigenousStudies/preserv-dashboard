import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetDashboardSession, mockSearchExclusionReviewTree } = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockSearchExclusionReviewTree: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

vi.mock('@lib/exclusionReviewQueries', () => ({
  searchExclusionReviewTree: mockSearchExclusionReviewTree,
}))

import { GET } from '@api/exclusion-review/search/route'

describe('exclusion review search route', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects search requests without a query string', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'viewer@example.org' },
    })

    const response = await GET(
      new NextRequest('http://localhost/api/exclusion-review/search'),
    )
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toBe('q is required.')
    expect(mockSearchExclusionReviewTree).not.toHaveBeenCalled()
  })

  it('returns search results for signed-in users', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'viewer@example.org' },
    })
    mockSearchExclusionReviewTree.mockResolvedValue({
      query: 'annual report',
      matches: [],
      ancestorDriveIdsToExpand: ['root-folder'],
      pathNodes: [],
    })

    const response = await GET(
      new NextRequest(
        'http://localhost/api/exclusion-review/search?q=annual%20report',
      ),
    )
    const payload = (await response.json()) as { result?: { query: string } }

    expect(response.status).toBe(200)
    expect(payload.result?.query).toBe('annual report')
  })

  it('returns a setup error when the exclusion review table is missing', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'viewer@example.org' },
    })
    mockSearchExclusionReviewTree.mockRejectedValue({
      code: 'P2021',
      meta: {
        modelName: 'drive_exclusion_review_items',
      },
    })

    const response = await GET(
      new NextRequest(
        'http://localhost/api/exclusion-review/search?q=annual%20report',
      ),
    )
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(503)
    expect(payload.error).toBe(
      'Exclusion review setup is incomplete in this environment. Run the dashboard database migrations and reload this page.',
    )
  })
})
