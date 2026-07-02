import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetNeedsReviewDocuments } = vi.hoisted(() => ({
  mockGetNeedsReviewDocuments: vi.fn(),
}))

vi.mock('@lib/queries', () => ({
  getNeedsReviewDocuments: mockGetNeedsReviewDocuments,
}))

vi.mock('@organisms/DocumentsTable', () => ({
  DocumentsTable: () => <div data-testid="review-queue-table">Review queue table</div>,
}))

import ReviewQueuePage from '@root/app/review-queue/page'

describe('ReviewQueuePage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders human judgment framing, a Ready for Library handoff link, and the existing table', () => {
    mockGetNeedsReviewDocuments.mockResolvedValue({
      items: [],
      total: 0,
      pageInfo: {
        endCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
        pageSize: 50,
        startCursor: null,
      },
    })

    const markup = renderToStaticMarkup(ReviewQueuePage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Review decisions and next step')
    expect(markup).toContain('human judgment')
    expect(markup).toContain('Ready for Library')
    expect(markup).toContain('/ready-for-library')
  })
})
