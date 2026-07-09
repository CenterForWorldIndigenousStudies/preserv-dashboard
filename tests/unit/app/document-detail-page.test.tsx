import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetDocumentDetail, mockDocumentVersionsButton } = vi.hoisted(() => ({
  mockGetDocumentDetail: vi.fn(),
  mockDocumentVersionsButton: vi.fn(() => null),
}))

vi.mock('@lib/queries', () => ({
  getDocumentDetail: mockGetDocumentDetail,
}))

vi.mock('@organisms/DocumentVersionsButton', () => ({
  DocumentVersionsButton: mockDocumentVersionsButton,
}))

vi.mock('@organisms/AuditHistoryTable', () => ({
  AuditHistoryTable: () => null,
}))

vi.mock('@organisms/DocumentLineageSection', () => ({
  DocumentLineageSection: () => null,
}))

vi.mock('@organisms/DocumentTagsEditor', () => ({
  DocumentTagsEditor: () => null,
}))

vi.mock('@organisms/ReviewHistoryTable', () => ({
  ReviewHistoryTable: () => null,
}))

import DocumentDetailPage from '@root/app/documents/[id]/page'

describe('DocumentDetailPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('passes the current detail href into version navigation', async () => {
    mockGetDocumentDetail.mockResolvedValue({
      document: {
        id: 'doc-1',
        name: 'Document One',
        id_legacy: 'legacy-1',
        filesize: 123,
        hash_binary: null,
        hash_content: null,
        created_at: null,
        updated_at: null,
        is_duplicate: false,
      },
      quality: null,
      versions: [],
      version_family: {
        version_group_id: 'vg-1',
        canonical_document_id: 'doc-1',
        documents: [],
      },
      metadata: [],
      document_to_batches: [],
      document_to_authors: [],
      document_to_tags: [],
      audits: [],
      reviews: [],
    })

    renderToStaticMarkup(
      await DocumentDetailPage({
        params: Promise.resolve({ id: 'doc-1' }),
        searchParams: Promise.resolve({
          from: '/ready-for-library?page=2&pageSize=50&search=Sample',
        }),
      }),
    )

    expect(mockDocumentVersionsButton).toHaveBeenCalledWith(
      expect.objectContaining({
        overviewHref: '/documents/doc-1?from=%2Fready-for-library%3Fpage%3D2%26pageSize%3D50%26search%3DSample',
      }),
      undefined,
    )
  })
})
