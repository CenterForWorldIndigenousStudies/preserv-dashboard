import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetReadyForLibraryDocuments,
  mockGetDocumentFilterOptions,
  mockReadyForLibraryTable,
} = vi.hoisted(() => ({
  mockGetReadyForLibraryDocuments: vi.fn(),
  mockGetDocumentFilterOptions: vi.fn(),
  mockReadyForLibraryTable: vi.fn(() => null),
}))

vi.mock('@lib/queries/readyForLibraryQueries', async (importOriginal) => ({
  ...(await importOriginal()),
  getReadyForLibraryDocuments: mockGetReadyForLibraryDocuments,
}))

vi.mock('@lib/queries/queries', () => ({
  getDocumentFilterOptions: mockGetDocumentFilterOptions,
}))

vi.mock('@organisms/ReadyForLibraryTable', () => ({
  ReadyForLibraryTable: mockReadyForLibraryTable,
}))

vi.mock('@organisms/ReadyForLibraryHandoff', () => ({
  ReadyForLibraryHandoff: () => <div>Ready for library handoff stub</div>,
}))

import ReadyForLibraryPage from '@root/app/ready-for-library/page'
import { parseReadyForLibraryQueryParams } from '@lib/queries/readyForLibraryQueries'

describe('ReadyForLibraryPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('parses the full Advanced Search filter set', () => {
    const query = parseReadyForLibraryQueryParams({
      search: 'Sample',
      contributor: 'Contributor',
      publisher: 'Publisher',
      tag: 'collection-tag',
      statuses: 'APPROVED,VALIDATED',
      documentType: 'unique',
      batch: 'batch-2026',
      createdFrom: '2026-01-01',
      createdTo: '2026-12-31',
      collection: 'Collection A',
      accessLevel: 'public',
    })

    expect(query).toMatchObject({
      search: 'Sample',
      filters: {
        contributor: 'Contributor',
        publisher: 'Publisher',
        tag: 'collection-tag',
        statuses: ['APPROVED', 'VALIDATED'],
        documentType: 'unique',
        batch: 'batch-2026',
        createdFrom: '2026-01-01',
        createdTo: '2026-12-31',
        collection: 'Collection A',
        accessLevel: 'public',
      },
    })
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
          access_level: 'public',
        },
      ],
      total: 1,
    })
    mockGetDocumentFilterOptions.mockResolvedValue({ collections: [], accessLevels: [], statuses: [] })

    const markup = renderToStaticMarkup(ReadyForLibraryPage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Post-approval handoff inspection')
    expect(markup).toContain(
      'Use this workspace to inspect approved documents with an access level and queue the downstream library handoff when the current review is complete. Metadata completeness is shown to support review, but runtime checks still apply.',
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
    expect(markup).toContain(
      'This page does not confirm final library handoff readiness until the handoff is queued and completes.',
    )
    expect(markup).not.toContain('Featured author')
  })
})
