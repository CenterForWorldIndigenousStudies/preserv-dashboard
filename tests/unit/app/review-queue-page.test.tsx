import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetNeedsReviewDocuments } = vi.hoisted(() => ({
  mockGetNeedsReviewDocuments: vi.fn(),
}))

const { mockGetNeedsReviewDocumentsCount } = vi.hoisted(() => ({
  mockGetNeedsReviewDocumentsCount: vi.fn(),
}))

vi.mock('@lib/queries/queries', () => ({
  getNeedsReviewDocuments: mockGetNeedsReviewDocuments,
  getNeedsReviewDocumentsCount: mockGetNeedsReviewDocumentsCount,
}))

vi.mock('@organisms/ReviewQueueTable', () => ({
  ReviewQueueTable: () => <div data-testid="review-queue-table">Review queue table</div>,
}))

import ReviewQueuePage from '@root/app/review-queue/page'

describe('ReviewQueuePage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the stable page header copy', async () => {
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
    const markup = renderToStaticMarkup(await ReviewQueuePage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Review Queue')
    expect(markup).toContain('Documents needing review.')
    expect(markup).toContain(
      'Use this human judgment workspace to review documents, make deliberate approve or reject decisions, and move approved work to Ready for Library.',
    )
    expect(markup).not.toContain('Ready for Library preview')
    expect(markup).not.toContain('role="tablist"')
    expect(markup).not.toContain('Review decisions and next step')
    expect(markup).not.toContain('Review Queue is where human judgment happens.')

    const cartPosition = markup.indexOf('Open reprocessing cart with 0 draft batches')
    const headerPosition = markup.indexOf('Documents needing review.')
    expect(cartPosition).toBeGreaterThanOrEqual(0)
    expect(headerPosition).toBeGreaterThanOrEqual(0)
    expect(cartPosition).toBeGreaterThan(headerPosition)

    expect(mockGetNeedsReviewDocumentsCount).not.toHaveBeenCalled()
    expect(mockGetNeedsReviewDocuments).not.toHaveBeenCalled()
  })
})
vi.mock('@lib/queries/reprocessingDraftQueries', () => ({
  getReprocessingDrafts: vi.fn().mockResolvedValue([]),
}))
