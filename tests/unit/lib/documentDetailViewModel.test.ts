import { describe, expect, it } from 'vitest'

import {
  buildCommentFields,
  buildDisplayedMetadata,
  buildPipelineDiagnostics,
  buildStageMetadata,
  ensureRequiredReadinessMetadata,
} from '@lib/documentDetailViewModel'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

const ordinaryField: MetadataField = {
  name: 'dc_title',
  displayName: 'Title',
  value: JSON.stringify({ value: 'Document title' }),
  value_type: 'string',
  notes: null,
}

function metadataField(name: string, value: unknown, valueType = 'string'): MetadataField {
  return {
    name,
    value: JSON.stringify({ value }),
    value_type: valueType,
    notes: null,
  }
}

describe('document detail view model', () => {
  it('adds missing required readiness fields with editor-compatible empty values', () => {
    const fields = ensureRequiredReadinessMetadata([ordinaryField])

    expect(fields.map((field) => field.name)).toEqual([
      'dc_date',
      'dc_description_abstract',
      'dc_language_iso',
      'dc_rights',
      'dc_subject',
      'dc_title',
      'dc_type',
    ])
    expect(fields.find((field) => field.name === 'dc_date')).toMatchObject({ value: '', value_type: 'unix_timestamp' })
    expect(fields.find((field) => field.name === 'dc_subject')).toMatchObject({ value: '', value_type: 'json' })
  })

  it('keeps ordinary metadata out of system, comment, and pipeline fields', () => {
    const unescoSubject = metadataField('dc_subject_unesco', ['History'])
    const fields = [
      ordinaryField,
      unescoSubject,
      metadataField('source_id', 'source-1'),
      metadataField('character_count', 120, 'number'),
      metadataField('comments_general', 'Internal note'),
      metadataField('comment_pipeline', { run: { service: 'ocr_processor' } }, 'json'),
      metadataField('document_splitter_pass', 1, 'number'),
      metadataField('mime_type', 'application/pdf'),
      metadataField('file_extension', 'pdf'),
      metadataField('binary_hash', 'duplicate-binary-hash'),
      metadataField('needs_review', 'review reason'),
      metadataField('preservation_candidate', true, 'boolean'),
      metadataField('collection', 'Education'),
    ]

    expect(buildDisplayedMetadata(fields)).toEqual([ordinaryField, unescoSubject])
  })

  it('groups stage fields in display order and omits empty stages', () => {
    const ocrField = metadataField('ocr_generated', true, 'boolean')
    const dedupField = metadataField('content_hash_timestamp', 1720000000, 'unix_timestamp')

    expect(buildStageMetadata([dedupField, ocrField])).toEqual([
      { title: 'OCR Processor', fields: [ocrField] },
      { title: 'Content Deduplication', fields: [dedupField] },
    ])
  })

  it('builds the fixed comment field list from quality and metadata sources', () => {
    const fields = [metadataField('comments_general', 'General metadata comment')]
    const quality = { comment: 'Quality comment', comment_additional: 'Additional quality comment' }

    expect(buildCommentFields(fields, quality as DocumentDetail['quality'])).toEqual([
      expect.objectContaining({ name: 'comment', value: JSON.stringify({ value: 'Quality comment' }) }),
      expect.objectContaining({
        name: 'comment_additional',
        value: JSON.stringify({ value: 'Additional quality comment' }),
      }),
      expect.objectContaining({ name: 'comments_additional', value: '' }),
      expect.objectContaining({ name: 'comments_control', value: '' }),
      expect.objectContaining({ name: 'comments_general', value: fields[0].value }),
      expect.objectContaining({ name: 'comment_validation', value: '' }),
      expect.objectContaining({ name: 'comment_validation_additional', value: '' }),
    ])
  })

  it('builds diagnostic events, batch links, and an anchor only when events exist', () => {
    const metadata = [
      metadataField(
        'comment_pipeline',
        {
          'ocr_processor:run-1': {
            service: 'ocr_processor',
            status: 'failed',
            timestamp: '2026-09-11T10:00:00Z',
            message: 'OCR failed.',
            batch_id: 'batch-1',
          },
        },
        'json',
      ),
    ]
    const detail = {
      document: { id: 'document-1', name: 'Document one' },
      document_to_batches: [{ batch_id: 'batch-1', batch_name: 'September ingest', batch_legacy_id: null }],
    } as DocumentDetail

    expect(buildPipelineDiagnostics(detail, metadata, '/documents/document-1')).toEqual({
      events: [
        expect.objectContaining({
          runKey: 'ocr_processor:run-1',
          batchId: 'batch-1',
          message: 'OCR failed.',
        }),
      ],
      batchLinks: {
        'batch-1': {
          name: 'September ingest',
          href: '/batches/batch-1?from=%2Fdocuments%2Fdocument-1&fromLabel=document+Document+one',
        },
      },
      diagnosticsHref: '#processing-diagnostics',
    })
  })
})
