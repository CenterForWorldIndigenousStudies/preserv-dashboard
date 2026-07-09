import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetReadyForLibraryDocuments,
  mockGetUniqueDocumentCountByAuthor,
  mockReadyForLibraryTable,
} = vi.hoisted(() => ({
  mockGetReadyForLibraryDocuments: vi.fn(),
  mockGetUniqueDocumentCountByAuthor: vi.fn(),
  mockReadyForLibraryTable: vi.fn(() => null),
}))

vi.mock('@lib/queries', () => ({
  getReadyForLibraryDocuments: mockGetReadyForLibraryDocuments,
}))

vi.mock('@lib/readyForLibraryAuthorMetrics', () => ({
  getUniqueDocumentCountByAuthor: mockGetUniqueDocumentCountByAuthor,
}))

vi.mock('@organisms/ReadyForLibraryTable', () => ({
  ReadyForLibraryTable: mockReadyForLibraryTable,
}))

import ReadyForLibraryPage from '@root/app/ready-for-library/page'

describe('ReadyForLibraryPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the updated post-approval framing and helper copy', () => {
    mockGetReadyForLibraryDocuments.mockResolvedValue({
      items: [
        {
          id: 'doc-1',
          name: 'Sample document',
          validation_status: 'APPROVED',
          validation_timestamp: 1720000000000,
          metadata_complete: false,
          access_level: 'open access',
        },
      ],
      total: 1,
    })
    mockGetUniqueDocumentCountByAuthor.mockResolvedValue(3)

    const markup = renderToStaticMarkup(ReadyForLibraryPage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Post-approval handoff inspection')
    expect(markup).toContain(
      'Use this workspace to inspect approved documents with an access level before the next handoff. Metadata completeness is shown to support review, but this page does not confirm final Fedora readiness.',
    )
    expect(markup).toContain('What this workspace tells you')
    expect(markup).toContain('Why documents appear here')
    expect(markup).toContain('Validation status is APPROVED.')
    expect(markup).toContain('An access level is set.')
    expect(markup).toContain('What to inspect before handoff')
    expect(markup).toContain(
      'This page shows whether required Dublin Core fields are present: dc_title, dc_type, dc_subject, and dc_rights.',
    )
    expect(markup).toContain('Documents can still appear here when Metadata Complete is Incomplete.')
    expect(markup).toContain('What this page does not confirm')
    expect(markup).toContain('This page does not confirm final Fedora handoff readiness.')
  })

})
