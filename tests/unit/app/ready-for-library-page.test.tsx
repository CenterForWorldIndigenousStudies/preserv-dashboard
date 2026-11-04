import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ACCESS_LEVEL_OPTIONS } from '@constants/accessLevels'
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

vi.mock('@organisms/PageInfoModal', () => ({
  PageInfoModal: ({ children, title }: { children: ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
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
      accessLevel: ACCESS_LEVEL_OPTIONS[0],
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
      accessLevel: ACCESS_LEVEL_OPTIONS[0],
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
          access_level: ACCESS_LEVEL_OPTIONS[0],
        },
      ],
      total: 1,
    })
    mockGetDocumentFilterOptions.mockResolvedValue({ collections: [], accessLevels: [], statuses: [] })

    const markup = renderToStaticMarkup(ReadyForLibraryPage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Ready for Library')
    expect(markup).toContain(
      'Select the documents you want to publish, then choose Actions &gt; Publish to create a new Data Ingester and Fedora Ingester batch.',
    )
    expect(markup).toContain('What this workspace tells you')
    expect(markup).toContain('Why documents appear here')
    expect(markup).toContain('Validation status and latest document state are APPROVED.')
    expect(markup).toContain('An access level is set.')
    expect(markup).toContain('What to inspect before publishing')
    expect(markup).toContain(
      'This page shows whether required Dublin Core fields are present: dc_title, dc_type, dc_subject, and dc_rights.',
    )
    expect(markup).toContain('Documents can still appear here when Metadata Complete is Incomplete.')
    expect(markup).toContain('What this page does not confirm')
    expect(markup).toContain(
      'The selected documents are published through a new Data Ingester batch followed by Fedora Ingester.',
    )
    expect(markup).not.toContain('Featured author')
    expect(markup).not.toContain('Queue ready documents for library')
  })
})
