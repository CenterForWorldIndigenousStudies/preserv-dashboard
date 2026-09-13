import { describe, expect, it } from 'vitest'

import { EDITABLE_DOCUMENT_METADATA_FIELDS, isEditableDocumentMetadataField } from '@constants/documentEditing'
import * as documentEditing from '@constants/documentEditing'
import { GENERATED_METADATA_EXTRACTOR_METADATA_FIELDS } from '@constants/generated/metadataExtractorFields'

describe('document editing metadata contract', () => {
  it('includes the explicitly approved metadata fields', () => {
    expect(EDITABLE_DOCUMENT_METADATA_FIELDS).toEqual(
      expect.arrayContaining([
        'classification',
        'comment',
        'comment_additional',
        'comment_control',
        'comments_additional',
        'comments_control',
        'comments_general',
        'comment_validation',
        'comment_validation_additional',
        'dc_coverage_spatial',
        'dc_coverage_cultural',
        'dc_subject_unesco',
        'dc_date',
        'dc_description',
        'dc_description_abstract',
        'dc_identifier_citation',
        'dc_identifier_iso',
        'dc_rights',
        'dc_rights_statement',
        'dc_source',
        'dc_subject',
        'dc_title',
        'dc_type',
        'institutional_filter_flag',
        'long_tail_keywords',
        'project',
        'rights_statement_explicit',
        'rights_statement_url',
        'sensitive',
        'seo_keywords',
        'validation_rights_statement',
      ]),
    )
  })

  it('includes all current metadata-extractor metadata targets', () => {
    expect('METADATA_EXTRACTOR_METADATA_FIELDS' in documentEditing).toBe(false)
    expect(
      GENERATED_METADATA_EXTRACTOR_METADATA_FIELDS.every((field) => EDITABLE_DOCUMENT_METADATA_FIELDS.includes(field)),
    ).toBe(true)
    expect(new Set(EDITABLE_DOCUMENT_METADATA_FIELDS).size).toBe(EDITABLE_DOCUMENT_METADATA_FIELDS.length)
    expect(GENERATED_METADATA_EXTRACTOR_METADATA_FIELDS).toEqual(
      expect.arrayContaining([
        'dc_title',
        'dc_date',
        'dc_description',
        'dc_description_abstract',
        'dc_type',
        'dc_language_iso',
        'dc_source',
        'dc_coverage_spatial',
        'dc_coverage_cultural',
        'brian_deer_code',
        'dc_identifier_doi',
        'dc_identifier_isbn',
        'dc_identifier_issn',
        'long_tail_keywords',
        'seo_keywords',
        'sensitive_content',
      ]),
    )
  })

  it('does not make diagnostics or the misspelled spatial field editable', () => {
    expect(isEditableDocumentMetadataField('rudolph_ryser_detected')).toBe(false)
    expect(isEditableDocumentMetadataField('dc_coverage_cspatial')).toBe(false)
    expect(isEditableDocumentMetadataField('dc_coverage_spatial')).toBe(true)
    expect(isEditableDocumentMetadataField('dc_subject_unesco')).toBe(true)
    expect(isEditableDocumentMetadataField('brian_deer_code')).toBe(true)
  })
})
