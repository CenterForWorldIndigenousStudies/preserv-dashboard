/** Generated from contracts/document-states.json; do not edit manually. */
export const GENERATED_DOCUMENT_STATES = {
  INITIAL: 'initial',
  INGESTED: 'ingested',
  BINARY_DEDUP_RESOLVED: 'binary_dedup_resolved',
  NORMALIZED: 'normalized',
  SPLIT_COMPLETE: 'split_complete',
  OCR_COMPLETE: 'ocr_complete',
  CONTENT_DEDUP_RESOLVED: 'content_dedup_resolved',
  SIMILARITY_RESOLVED: 'similarity_resolved',
  METADATA_EXTRACTED: 'metadata_extracted',
  RIGHTS_DETERMINED: 'rights_determined',
  METADATA_VALIDATED: 'metadata_validated',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NOT_APPROVED: 'not_approved',
  INGESTED_FEDORA: 'ingested_fedora',
  FAILED: 'failed',
} as const

export type GeneratedDocumentState = (typeof GENERATED_DOCUMENT_STATES)[keyof typeof GENERATED_DOCUMENT_STATES]
