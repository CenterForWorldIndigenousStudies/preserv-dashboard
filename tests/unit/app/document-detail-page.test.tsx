import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetDocumentDetail,
  mockDocumentVersionsButton,
  mockDetailPageSection,
  mockDetailFieldGrid,
  mockValuePillList,
  mockGetReprocessingDrafts,
  mockReprocessingCart,
  mockDocumentReviewToolbar,
  mockDocumentPropertiesSection,
  mockDocumentVersionsSection,
  mockDocumentMetadataSection,
  mockDocumentCommentsSection,
  mockDocumentBatchesSection,
  mockDocumentHistorySections,
  mockAssignCollectionButton,
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
  mockValuePillList: vi.fn(
    ({ values, getHref }: { values: string[]; getHref?: (value: string, index: number) => string | undefined }) => (
      <div data-testid={'value-pill-list'}>
        {values.map((value, index) => {
          const href = getHref?.(value, index)
          return href ? (
            <a key={value} href={href}>
              {value}
            </a>
          ) : (
            <span key={value}>{value}</span>
          )
        })}
      </div>
    ),
  ),
  mockGetReprocessingDrafts: vi.fn().mockResolvedValue([]),
  mockReprocessingCart: vi.fn(() => <div data-testid={'batch-cart'}>{'Batch cart'}</div>),
  mockDocumentReviewToolbar: vi.fn(
    ({
      hasOpenReprocessingDraft,
      isCandidate,
      isCanonical,
    }: {
      hasOpenReprocessingDraft: boolean
      isCandidate: boolean
      isCanonical: boolean
    }) => (
      <div data-testid={'document-review-toolbar'}>
        {'Document review controls'}
        {isCandidate ? 'Candidate' : null}
        {isCanonical ? 'Canonical' : null}
        {hasOpenReprocessingDraft ? 'Actions (1)' : null}
      </div>
    ),
  ),
  mockDocumentPropertiesSection: vi.fn(() => <section>{'Document Properties'}</section>),
  mockDocumentVersionsSection: vi.fn(({ versions }: { versions: unknown[] }) => (
    <section>
      {'Versions'}
      {versions.length > 0 ? 'Version Group Changes Summary Notes Similarity Analyzed At' : null}
    </section>
  )),
  mockDocumentMetadataSection: vi.fn(({ metadata }: { metadata: Array<{ name: string }> }) => (
    <section>
      {'Metadata'}
      {metadata.some((field) => field.name === 'document_splitter_pass') ? 'Document Splitter' : null}
      {metadata.some((field) => field.name === 'pages_rotated') ? 'Page Rotator' : null}
      {metadata.some((field) => field.name === 'ocr_generated') ? 'OCR Processor' : null}
      {metadata.some((field) => field.name === 'content_hash_timestamp') ? 'Content Deduplication' : null}
      {metadata.some((field) => field.name === 'source_id') ? 'Recorded source metadata' : null}
      {'Contributors and Publishers'}
    </section>
  )),
  mockDocumentCommentsSection: vi.fn(() => (
    <section>
      {'Comments'}
      {
        'Additional Comment Additional Comments Control Comments General Comments Validation Comment Additional Validation Comment'
      }
    </section>
  )),
  mockDocumentBatchesSection: vi.fn(() => <section>{'Batches Processing Diagnostics June 3 Ingest'}</section>),
  mockDocumentHistorySections: vi.fn(() => <section>{'Audit History State History'}</section>),
  mockAssignCollectionButton: vi.fn(({ currentTags }: { currentTags: string[] }) => (
    <div data-testid={'assign-collection-button'}>{currentTags.join(',')}</div>
  )),
}))

vi.mock('@lib/queries/documentQueries', () => ({
  getDocumentDetail: mockGetDocumentDetail,
}))

vi.mock('@lib/queries/batchDraftQueries', () => ({
  getBatchDrafts: mockGetReprocessingDrafts,
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

vi.mock('@molecules/ValuePillList', () => ({
  ValuePillList: mockValuePillList,
}))

vi.mock('@organisms/DocumentTagsEditor', () => ({
  DocumentTagsEditor: () => null,
}))

vi.mock('@organisms/AssignCollectionButton', () => ({
  AssignCollectionButton: mockAssignCollectionButton,
}))

vi.mock('@organisms/DocumentEditCoordinator', () => ({
  DocumentEditCoordinator: ({
    children,
    toolbarContent,
    toolbarTrailingContent,
  }: {
    children: React.ReactNode
    toolbarContent?: React.ReactNode
    toolbarTrailingContent?: React.ReactNode
  }) => (
    <>
      <div data-testid={'document-review-toolbar'}>
        {toolbarContent}
        <span>{'Edit toggle'}</span>
        {toolbarTrailingContent}
      </div>
      {children}
    </>
  ),
}))

vi.mock('@molecules/BatchCart', () => ({
  BatchCart: mockReprocessingCart,
}))

vi.mock('@organisms/DocumentReviewToolbar', () => ({
  DocumentReviewToolbar: mockDocumentReviewToolbar,
}))

vi.mock('@organisms/StateHistoryTable', () => ({
  StateHistoryTable: () => null,
}))

vi.mock('@organisms/DocumentPropertiesSection', () => ({
  DocumentPropertiesSection: mockDocumentPropertiesSection,
}))

vi.mock('@organisms/DocumentVersionsSection', () => ({
  DocumentVersionsSection: mockDocumentVersionsSection,
}))

vi.mock('@organisms/DocumentMetadataSection', () => ({
  DocumentMetadataSection: mockDocumentMetadataSection,
}))

vi.mock('@organisms/DocumentCommentsSection', () => ({
  DocumentCommentsSection: mockDocumentCommentsSection,
}))

vi.mock('@organisms/DocumentBatchesSection', () => ({
  DocumentBatchesSection: mockDocumentBatchesSection,
}))

vi.mock('@organisms/DocumentHistorySections', () => ({
  DocumentHistorySections: mockDocumentHistorySections,
}))

import DocumentDetailPage from '@root/app/documents/[id]/page'
import { READY_FOR_LIBRARY_PATH } from '@constants/paths'

describe('DocumentDetailPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('passes the current detail href into version navigation', async () => {
    mockGetReprocessingDrafts.mockResolvedValueOnce([
      {
        id: 'draft-1',
        name: 'Reprocessing batch',
        restartStage: 'ocr_processor',
        requestedStages: ['ocr_processor'],
        pipelineConfig: undefined,
        documentCount: 1,
        createdAt: '2026-06-03T08:00:00Z',
      },
    ])
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
      quality: { comment: 'Control comment', comment_additional: 'Additional comment' },
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
      readiness: {
        isPreservationCandidate: true,
        approved: true,
        unmetRequirements: [],
        reasonGroups: [],
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
          name: 'comment_additional',
          value: JSON.stringify({ value: 'Legacy metadata duplicate' }),
          value_type: 'string',
          notes: null,
        },
        {
          name: 'comments_additional',
          value: JSON.stringify({ value: 'Additional metadata comment' }),
          value_type: 'string',
          notes: null,
        },
        {
          name: 'comments_control',
          value: JSON.stringify({ value: 'Control metadata comment' }),
          value_type: 'string',
          notes: null,
        },
        {
          name: 'comments_general',
          value: JSON.stringify({ value: 'General metadata comment' }),
          value_type: 'string',
          notes: null,
        },
        {
          name: 'comment_validation',
          value: JSON.stringify({ value: 'Validation metadata comment' }),
          value_type: 'string',
          notes: null,
        },
        {
          name: 'comment_validation_additional',
          value: JSON.stringify({ value: 'Additional validation metadata comment' }),
          value_type: 'string',
          notes: null,
        },
        {
          name: 'needs_review',
          value: JSON.stringify({ metadata_extractor: ['Missing rights statement.'] }),
          value_type: 'json',
          notes: 'Review reasons recorded during extraction.',
        },
        {
          name: 'dc_coverage_cultural',
          value: JSON.stringify({ value: ['Cultural topic'] }),
          value_type: 'json',
          notes: 'Cultural coverage terms.',
        },
        {
          name: 'dc_subject',
          value: JSON.stringify({ value: ['Subject one', 'Subject two'] }),
          value_type: 'json',
          notes: 'Subject terms.',
        },
        {
          name: 'long_tail_keywords',
          value: JSON.stringify({ value: ['Long tail keyword'] }),
          value_type: 'json',
          notes: 'Long-tail search terms.',
        },
        {
          name: 'seo_keywords',
          value: JSON.stringify({ value: ['SEO keyword'] }),
          value_type: 'json',
          notes: 'Search engine terms.',
        },
        { name: 'character_count', value: '{"value":1234}', value_type: 'number', notes: null },
        { name: 'content_hash_algorithm', value: '{"value":"sha256"}', value_type: 'string', notes: null },
        { name: 'legacy_file_size_origin', value: '{"value":456}', value_type: 'number', notes: null },
        { name: 'legacy_format_origin', value: '{"value":"PDF"}', value_type: 'string', notes: null },
        { name: 'document_splitter_pass', value: '{"value":2}', value_type: 'number', notes: null },
        { name: 'pages_rotated', value: '{"value":true}', value_type: 'boolean', notes: null },
        { name: 'ocr_generated', value: '{"value":true}', value_type: 'boolean', notes: null },
        { name: 'content_hash_timestamp', value: '{"value":1720000000}', value_type: 'unix_timestamp', notes: null },
      ],
      document_to_batches: [
        {
          id: 'link-1',
          document_id: 'doc-1',
          batch_id: 'batch-1',
          added_at: '2026-06-03T08:00:00Z',
          batch_started_at: '2026-06-03T09:00:00Z',
          batch_document_count: 7,
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
      document_to_contributors: [
        {
          id: 'dtc-1',
          document_id: 'doc-1',
          contributor_id: 'contributor-1',
          contributor_name: 'Ada Example',
          type: 'PRIMARY',
          role: 'author',
          notes: 'Primary author.',
        },
      ],
      document_to_publishers: [
        {
          id: 'dtp-1',
          document_id: 'doc-1',
          publisher_id: 'publisher-1',
          publisher_name: 'Example Press',
          notes: 'Original publisher.',
        },
      ],
      document_to_tags: [
        {
          id: 'document-tag-1',
          document_id: 'doc-1',
          tag_id: 'collection-tag-1',
          notes: null,
          tags: { id: 'collection-tag-1', name: 'Collection A', notes: null, is_collection: true },
        },
      ],
      audits: [],
      state_history: [],
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
    expect(markup).toContain('Document Properties')
    expect(markup).toContain('assign-collection-button')
    expect(markup).toContain('Versions')
    expect(markup).toContain('Metadata')
    expect(markup).toContain('Comments')
    expect(markup).toContain('Batches')
    expect(markup).toContain('Audit History')
    expect(markup).toContain('State History')
    expect(markup.indexOf('Document Properties')).toBeLessThan(markup.indexOf('Versions'))
    expect(markup.indexOf('Versions')).toBeLessThan(markup.indexOf('Metadata'))
    expect(markup.indexOf('Metadata')).toBeLessThan(markup.indexOf('Comments'))
    expect(markup.indexOf('Comments')).toBeLessThan(markup.indexOf('Batches'))
    expect(markup.indexOf('Batches')).toBeLessThan(markup.indexOf('Audit History'))
    expect(markup).toContain('Document review controls')
    expect(markup).toContain('Batch cart')
    expect(markup.indexOf('Edit toggle')).toBeLessThan(markup.indexOf('Batch cart'))
    expect(markup).toContain('Candidate')
    expect(markup).toContain('Canonical')
    expect(markup).not.toContain('Version Family')
    expect(markup).not.toContain('Canonical document ID')
    expect(markup).not.toContain('Related documents')
    expect(markup).not.toContain('Current document status')
    expect(mockDocumentPropertiesSection).toHaveBeenCalledTimes(1)
    expect(mockDocumentVersionsSection).toHaveBeenCalledTimes(1)
    expect(mockDocumentMetadataSection).toHaveBeenCalledTimes(1)
    expect(mockDocumentCommentsSection).toHaveBeenCalledTimes(1)
    expect(mockDocumentBatchesSection).toHaveBeenCalledTimes(1)
    expect(mockDocumentHistorySections).toHaveBeenCalledTimes(1)
    expect(mockAssignCollectionButton).toHaveBeenCalledWith(
      { documentId: 'doc-1', currentTags: ['Collection A'] },
      undefined,
    )
    expect(mockDocumentReviewToolbar).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-1',
        hasOpenReprocessingDraft: false,
        isCandidate: true,
        isCanonical: true,
      }),
      undefined,
    )
  })

  it('does not render empty stage or legacy metadata accordions', async () => {
    mockGetDocumentDetail.mockResolvedValue({
      document: {
        id: 'doc-2',
        name: 'Document Two',
        id_legacy: null,
        filesize: null,
        hash_binary: null,
        hash_content: null,
        created_at: null,
        updated_at: null,
        is_duplicate: false,
      },
      quality: null,
      access_levels: [],
      versions: [],
      version_family: null,
      metadata: [{ name: 'title', value: 'Document title', value_type: 'string', notes: null }],
      document_to_batches: [],
      document_to_contributors: [],
      document_to_publishers: [],
      document_to_tags: [],
      audits: [],
      state_history: [],
    })

    const markup = renderToStaticMarkup(
      await DocumentDetailPage({
        params: Promise.resolve({ id: 'doc-2' }),
        searchParams: Promise.resolve({}),
      }),
    )

    expect(markup).not.toContain('Document Splitter')
    expect(markup).not.toContain('Page Rotator')
    expect(markup).not.toContain('OCR Processor')
    expect(markup).not.toContain('Content Deduplication')
    expect(markup).not.toContain('Legacy')
    expect(markup).not.toContain('Batch cart')
    expect(markup).toContain('Comments')
    expect(markup).toContain('Comment')
    expect(markup).toContain('Additional Comment')
    expect(markup).toContain('Additional Comments')
    expect(markup).toContain('Control Comments')
    expect(markup).toContain('General Comments')
    expect(markup).toContain('Validation Comment')
    expect(markup).toContain('Additional Validation Comment')
  })
})
