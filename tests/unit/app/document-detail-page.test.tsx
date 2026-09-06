import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetDocumentDetail,
  mockDocumentVersionsButton,
  mockDetailPageSection,
  mockDetailFieldGrid,
  mockDocumentLineageSection,
} = vi.hoisted(() => ({
  mockGetDocumentDetail: vi.fn(),
  mockDocumentVersionsButton: vi.fn(() => null),
  mockDetailPageSection: vi.fn(({ children }: { children: React.ReactNode }) => <section>{children}</section>),
  mockDetailFieldGrid: vi.fn(
    ({ fields }: { fields: Array<{ key: string; label: string; value: React.ReactNode }> }) => (
      <dl>
        {fields.map((field) => (
          <div key={field.key}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
    ),
  ),
  mockDocumentLineageSection: vi.fn(() => <div data-testid={'lineage-section'} />),
}))

vi.mock('@lib/queries/queries', () => ({
  getDocumentDetail: mockGetDocumentDetail,
}))

vi.mock('@organisms/DocumentVersionsButton', () => ({
  DocumentVersionsButton: mockDocumentVersionsButton,
}))

vi.mock('@organisms/DetailPageSection', () => ({
  DetailPageSection: mockDetailPageSection,
}))

vi.mock('@molecules/DetailFieldGrid', () => ({
  DetailFieldGrid: mockDetailFieldGrid,
}))

vi.mock('@organisms/AuditHistoryTable', () => ({
  AuditHistoryTable: () => null,
}))

vi.mock('@organisms/DocumentLineageSection', () => ({
  DocumentLineageSection: mockDocumentLineageSection,
}))

vi.mock('@organisms/DocumentTagsEditor', () => ({
  DocumentTagsEditor: () => null,
}))

vi.mock('@organisms/ReviewHistoryTable', () => ({
  ReviewHistoryTable: () => null,
}))

import DocumentDetailPage from '@root/app/documents/[id]/page'
import { DOCUMENTS_PATH, READY_FOR_LIBRARY_PATH } from '@constants/paths'

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
      access_levels: ['internal', 'restricted'],
      versions: [
        {
          id: 'version-1',
          document_id: 'doc-1',
          version_group_id: 'vg-1',
          notes: 'Version notes',
          changes_summary: 'Updated metadata',
          similarity_score: 0.98,
          created_at: null,
          updated_at: null,
          analyzed_at: null,
        },
      ],
      version_family: {
        version_group_id: 'vg-1',
        canonical_document_id: 'doc-1',
        documents: [],
      },
      metadata: [
        {
          name: 'source_id',
          value: 'drive-file-123',
          value_type: 'string',
          notes: 'The identifier assigned by the source system.',
        },
        { name: 'title', value: 'Document title', value_type: 'string', notes: 'The document title.' },
        {
          name: 'needs_review',
          value: JSON.stringify({ metadata_validator: ['Missing rights statement.'] }),
          value_type: 'json',
          notes: 'Review reasons recorded during validation.',
        },
      ],
      document_to_batches: [
        {
          id: 'link-1',
          document_id: 'doc-1',
          batch_id: 'batch-1',
          added_at: '2026-06-03T08:00:00Z',
          batch_origin: 'Drive ingest folder A',
          cost: '$0.00',
          processing_time_seconds: 42,
          ocr_quality_low: false,
          ocr_quality_medium: true,
          batch_legacy_id: 'legacy-batch-1',
          batch_name: 'June 3 Ingest',
          batch_status: 'complete',
        },
      ],
      document_to_authors: [],
      document_to_tags: [],
      audits: [],
      reviews: [],
    })

    const markup = renderToStaticMarkup(
      await DocumentDetailPage({
        params: Promise.resolve({ id: 'doc-1' }),
        searchParams: Promise.resolve({
          from: `${READY_FOR_LIBRARY_PATH}?page=2&pageSize=50&search=Sample`,
          fromLabel: 'Ready for Library',
        }),
      }),
    )

    expect(markup).toContain('Return to Ready for Library')
    expect(markup).toContain('Access Status')
    expect(markup).toContain('internal, restricted')
    expect(markup).toContain('Metadata')
    expect(markup).toContain('Recorded source metadata')
    expect(markup.match(/<th[^>]*>.*source_id.*<\/th>/g)).toHaveLength(1)
    expect(markup).toContain('source_id: The identifier assigned by the source system.')
    expect(markup).toContain('title: The document title.')
    expect(markup).toContain('Metadata Validator')
    expect(markup).toContain('Missing rights statement.')
    expect(markup).toContain('Document title')
    expect(markup).toContain('Batches')
    expect(markup).toContain('June 3 Ingest')
    expect(markup).toContain('Processing Diagnostics')
    expect(markup.indexOf('Metadata')).toBeLessThan(markup.indexOf('Batches'))
    expect(markup.indexOf('Batches')).toBeLessThan(markup.indexOf('Processing Diagnostics'))
    expect(markup).toContain('Version Group')
    expect(markup).toContain('Changes Summary')
    expect(markup).toContain('Version notes')
    expect(markup).toContain('Updated metadata')
    expect(markup.indexOf('Versions')).toBeLessThan(markup.indexOf('data-testid="lineage-section"'))
    expect(markup.indexOf('data-testid="lineage-section"')).toBeLessThan(markup.indexOf('Metadata'))
    expect(mockDetailPageSection).toHaveBeenCalledWith(expect.objectContaining({ title: 'Document Fields' }), undefined)
    expect(mockDetailFieldGrid).toHaveBeenCalledTimes(2)
    expect(mockDocumentVersionsButton).toHaveBeenCalledWith(
      expect.objectContaining({
        returnHref: `${DOCUMENTS_PATH}/doc-1?from=%2Fready-for-library%3Fpage%3D2%26pageSize%3D50%26search%3DSample&fromLabel=Ready+for+Library`,
        returnDocumentName: 'Document One',
      }),
      undefined,
    )
    expect(mockDocumentLineageSection).toHaveBeenCalledTimes(1)
  })
})
