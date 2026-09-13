export const EDITABLE_DOCUMENT_METADATA_FIELDS = [
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
] as const

export const METADATA_EXTRACTOR_METADATA_FIELDS = [
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
] as const

export type EditableDocumentMetadataField =
  | (typeof EDITABLE_DOCUMENT_METADATA_FIELDS)[number]
  | (typeof METADATA_EXTRACTOR_METADATA_FIELDS)[number]

const EDITABLE_DOCUMENT_METADATA_FIELD_SET = new Set<string>([
  ...EDITABLE_DOCUMENT_METADATA_FIELDS,
  ...METADATA_EXTRACTOR_METADATA_FIELDS,
])

export function isEditableDocumentMetadataField(name: string): name is EditableDocumentMetadataField {
  return EDITABLE_DOCUMENT_METADATA_FIELD_SET.has(name) && name !== 'dc_coverage_cspatial'
}
