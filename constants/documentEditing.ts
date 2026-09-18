import { GENERATED_METADATA_EXTRACTOR_METADATA_FIELDS } from '@constants/generated/metadataExtractorFields'

export const DOCUMENT_ACCESS_LEVEL_FIELD = 'access_level' as const

const DASHBOARD_EDITABLE_DOCUMENT_METADATA_FIELDS = [
  'classification',
  'comment',
  'comment_additional',
  'comment_control',
  'comments_additional',
  'comments_control',
  'comments_general',
  'comment_validation',
  'comment_validation_additional',
  'dc_identifier_iso',
  'dc_rights_statement',
  'dc_subject',
  'institutional_filter_flag',
  'project',
  'rights_statement_explicit',
  'rights_statement_url',
  'sensitive',
  'validation_rights_statement',
] as const

export const EDITABLE_DOCUMENT_METADATA_FIELDS = [
  ...DASHBOARD_EDITABLE_DOCUMENT_METADATA_FIELDS,
  ...GENERATED_METADATA_EXTRACTOR_METADATA_FIELDS,
] as const

export type EditableDocumentMetadataField = (typeof EDITABLE_DOCUMENT_METADATA_FIELDS)[number]

const EDITABLE_DOCUMENT_METADATA_FIELD_SET = new Set<string>(EDITABLE_DOCUMENT_METADATA_FIELDS)

export function isEditableDocumentMetadataField(name: string): name is EditableDocumentMetadataField {
  return EDITABLE_DOCUMENT_METADATA_FIELD_SET.has(name) && name !== 'dc_coverage_cspatial'
}
