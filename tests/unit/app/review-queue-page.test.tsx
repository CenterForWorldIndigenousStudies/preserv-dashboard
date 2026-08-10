import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetNeedsReviewDocuments } = vi.hoisted(() => ({
  mockGetNeedsReviewDocuments: vi.fn(),
}))

const { mockGetNeedsReviewDocumentsCount, mockGetReadyForLibraryDocuments } = vi.hoisted(() => ({
  mockGetNeedsReviewDocumentsCount: vi.fn(),
  mockGetReadyForLibraryDocuments: vi.fn(),
}))

vi.mock('@lib/queries/queries', () => ({
  getNeedsReviewDocuments: mockGetNeedsReviewDocuments,
  getNeedsReviewDocumentsCount: mockGetNeedsReviewDocumentsCount,
  getReadyForLibraryDocuments: mockGetReadyForLibraryDocuments,
}))

vi.mock('@organisms/DocumentsTable', () => ({
  DocumentsTable: () => <div data-testid="review-queue-table">Review queue table</div>,
}))

import ReviewQueuePage from '@root/app/review-queue/page'

describe('ReviewQueuePage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the stable page header copy and calls the route data helpers', async () => {
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
    mockGetNeedsReviewDocumentsCount.mockResolvedValue(3)
    mockGetReadyForLibraryDocuments.mockResolvedValue({
      items: [],
      total: 7,
    })

    const markup = renderToStaticMarkup(await ReviewQueuePage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Review Queue')
    expect(markup).toContain('Documents needing review.')
    expect(markup).toContain(
      'Use this human judgment workspace to review documents that need a deliberate approve or reject decision before they move forward.',
    )

    expect(mockGetNeedsReviewDocumentsCount).toHaveBeenCalledTimes(1)
    expect(mockGetNeedsReviewDocumentsCount).toHaveBeenCalledWith({
      statuses: ['NEEDS_REVIEW', 'METADATA_ISSUES', 'FORMAT_ERRORS'],
    })
    expect(mockGetReadyForLibraryDocuments).toHaveBeenCalledTimes(1)
    expect(mockGetReadyForLibraryDocuments).toHaveBeenCalledWith()
    expect(mockGetNeedsReviewDocuments).not.toHaveBeenCalled()
  })
})
