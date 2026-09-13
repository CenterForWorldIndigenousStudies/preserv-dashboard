/** Generated from contracts/metadata-extractor-fields.json; do not edit manually. */
export const GENERATED_METADATA_EXTRACTOR_FIELDS = {
  DC_TITLE: {
    name: 'dc_title',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_DATE: {
    name: 'dc_date',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_DESCRIPTION: {
    name: 'dc_description',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_DESCRIPTION_ABSTRACT: {
    name: 'dc_description_abstract',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_TYPE: {
    name: 'dc_type',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_LANGUAGE_ISO: {
    name: 'dc_language_iso',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_SOURCE: {
    name: 'dc_source',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_COVERAGE_SPATIAL: {
    name: 'dc_coverage_spatial',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_COVERAGE_CULTURAL: {
    name: 'dc_coverage_cultural',
    target: 'metadata',
    value_shape: 'list',
  },
  DC_IDENTIFIER_DOI: {
    name: 'dc_identifier_doi',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_IDENTIFIER_ISBN: {
    name: 'dc_identifier_isbn',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_IDENTIFIER_ISSN: {
    name: 'dc_identifier_issn',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_RIGHTS: {
    name: 'dc_rights',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_IDENTIFIER_CITATION: {
    name: 'dc_identifier_citation',
    target: 'metadata',
    value_shape: 'scalar',
  },
  DC_SUBJECT_UNESCO: {
    name: 'dc_subject_unesco',
    target: 'metadata',
    value_shape: 'list',
  },
  BRIAN_DEER_CODE: {
    name: 'brian_deer_code',
    target: 'metadata',
    value_shape: 'scalar',
  },
  LONG_TAIL_KEYWORDS: {
    name: 'long_tail_keywords',
    target: 'metadata',
    value_shape: 'list',
  },
  SEO_KEYWORDS: {
    name: 'seo_keywords',
    target: 'metadata',
    value_shape: 'list',
  },
  SENSITIVE_CONTENT: {
    name: 'sensitive_content',
    target: 'metadata',
    value_shape: 'scalar',
  },
  AUTHORS: {
    name: 'authors',
    target: 'contributors',
    value_shape: 'list',
  },
  PUBLISHER: {
    name: 'publisher',
    target: 'publishers',
    value_shape: 'scalar',
  },
  RUDOLPH_RYSER_DETECTED: {
    name: 'rudolph_ryser_detected',
    target: 'processing_details',
    value_shape: 'boolean',
  },
  RUDOLPH_RYSER_DETECTED_FROM_TEXT: {
    name: 'rudolph_ryser_detected_from_text',
    target: 'processing_details',
    value_shape: 'boolean',
  },
} as const

export type GeneratedMetadataExtractorField =
  (typeof GENERATED_METADATA_EXTRACTOR_FIELDS)[keyof typeof GENERATED_METADATA_EXTRACTOR_FIELDS]
export type GeneratedMetadataExtractorFieldKey = keyof typeof GENERATED_METADATA_EXTRACTOR_FIELDS

export const GENERATED_METADATA_EXTRACTOR_METADATA_FIELDS = [
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_TITLE.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_DATE.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_DESCRIPTION.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_DESCRIPTION_ABSTRACT.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_TYPE.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_LANGUAGE_ISO.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_SOURCE.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_COVERAGE_SPATIAL.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_COVERAGE_CULTURAL.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_IDENTIFIER_DOI.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_IDENTIFIER_ISBN.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_IDENTIFIER_ISSN.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_RIGHTS.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_IDENTIFIER_CITATION.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.DC_SUBJECT_UNESCO.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.BRIAN_DEER_CODE.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.LONG_TAIL_KEYWORDS.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.SEO_KEYWORDS.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.SENSITIVE_CONTENT.name,
] as const

export const GENERATED_METADATA_EXTRACTOR_RELATIONSHIP_FIELDS = [
  GENERATED_METADATA_EXTRACTOR_FIELDS.AUTHORS.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.PUBLISHER.name,
] as const

export const GENERATED_METADATA_EXTRACTOR_PROCESSING_DETAIL_FIELDS = [
  GENERATED_METADATA_EXTRACTOR_FIELDS.RUDOLPH_RYSER_DETECTED.name,
  GENERATED_METADATA_EXTRACTOR_FIELDS.RUDOLPH_RYSER_DETECTED_FROM_TEXT.name,
] as const
