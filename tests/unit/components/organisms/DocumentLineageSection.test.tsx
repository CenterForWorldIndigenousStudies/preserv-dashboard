import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { DocumentDetail } from 'types/documents'

import { DocumentLineageSection } from '@organisms/DocumentLineageSection'

const detailWithLineage: DocumentDetail = {
  document: {
    id: 'doc-1',
    filesize: 1024,
    hash_binary: 'binary-1',
    hash_content: 'content-1',
    id_legacy: 'LEG-1',
    name: 'Document One',
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-02T12:00:00Z',
    is_duplicate: true,
  },
  quality: null,
  versions: [],
  version_family: {
    version_group_id: 'vg-1',
    canonical_document_id: 'doc-canonical',
    documents: [
      {
        id: 'doc-canonical',
        filesize: 1024,
        hash_binary: 'binary-canonical',
        hash_content: 'content-canonical',
        id_legacy: 'LEG-CAN',
        source_id: null,
        name: 'Canonical Document',
        created_at: '2026-05-20T12:00:00Z',
        updated_at: '2026-05-21T12:00:00Z',
        is_duplicate: false,
        is_canonical: true,
      },
      {
        id: 'doc-1',
        filesize: 1024,
        hash_binary: 'binary-1',
        hash_content: 'content-1',
        id_legacy: 'LEG-1',
        source_id: null,
        name: 'Document One',
        created_at: '2026-06-01T12:00:00Z',
        updated_at: '2026-06-02T12:00:00Z',
        is_duplicate: true,
        is_canonical: false,
      },
    ],
  },
  metadata: [
    { name: 'source_id', value: 'drive-file-123', value_type: 'string' },
    { name: 'origin_source_id', value: 'drive-file-origin', value_type: 'string' },
    { name: 'origin_parent_source_id', value: 'drive-folder-456', value_type: 'string' },
    { name: 'source_updated_at', value: '2026-05-31T09:15:00Z', value_type: 'datetime' },
    { name: 'unrelated_field', value: 'ignore me', value_type: 'string' },
  ],
  document_to_batches: [
    {
      id: 'link-1',
      document_id: 'doc-1',
      batch_id: 'batch-1',
      added_at: '2026-06-03T08:00:00Z',
      batch_origin: 'Drive ingest folder A',
      cost: null,
      processing_time_seconds: 42,
      ocr_quality_low: false,
      ocr_quality_medium: true,
      batch_legacy_id: 'legacy-batch-1',
      batch_name: 'June 3 Ingest',
    },
  ],
  document_to_authors: [],
  document_to_tags: [],
  audits: [],
  reviews: [],
}

const sparseDetail: DocumentDetail = {
  document: {
    id: 'doc-2',
    filesize: 2048,
    hash_binary: 'binary-2',
    hash_content: 'content-2',
    id_legacy: null,
    name: 'Document Two',
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-02T12:00:00Z',
    is_duplicate: false,
  },
  quality: null,
  versions: [],
  version_family: null,
  metadata: [{ name: 'unrelated_field', value: 'still ignored', value_type: 'string' }],
  document_to_batches: [],
  document_to_authors: [],
  document_to_tags: [],
  audits: [],
  reviews: [],
}

describe('DocumentLineageSection', () => {
  it('renders related version family details, recorded source metadata, and batch links using existing signals only', () => {
    const markup = renderToStaticMarkup(<DocumentLineageSection detail={detailWithLineage} />)

    expect(markup).toContain('Lineage and Provenance')
    expect(markup).toContain('Related version family')
    expect(markup).toContain('Canonical document ID')
    expect(markup).toContain('doc-canonical')
    expect(markup).toContain('Current document status')
    expect(markup).toContain('Duplicate document')
    expect(markup).toContain('Recorded source metadata')
    expect(markup).toContain('source_id')
    expect(markup).toContain('origin_source_id')
    expect(markup).toContain('origin_parent_source_id')
    expect(markup).not.toContain('unrelated_field')
    expect(markup).toContain('Batch links')
    expect(markup).toContain('June 3 Ingest')
    expect(markup).toContain('Drive ingest folder A')
    expect(markup).toContain('2026-06-03 08:00 UTC')
  })

  it('renders a sparse-data empty state when no supported lineage or provenance signals are available', () => {
    const markup = renderToStaticMarkup(<DocumentLineageSection detail={sparseDetail} />)

    expect(markup).toContain('Lineage and Provenance')
    expect(markup).toContain('No lineage or provenance details are available for this document.')
    expect(markup).not.toContain('Recorded source metadata')
    expect(markup).not.toContain('Batch links')
    expect(markup).not.toContain('Related version family')
  })
})
