import type { DbDocumentQuality, DbDocumentVersion } from 'types/db'

export interface Document {
  id: string
  filesize: number | null
  hash_binary: string | null
  hash_content: string | null
  id_legacy: string | null
  source_id?: string | null
  name: string | null
  validation_status?: string | null
  validation_timestamp?: string | number | null
  validator_name?: string | null
  validation_comment?: string | null
  validation_comment_additional?: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  is_duplicate?: boolean
}

export interface DocumentQuality extends Omit<DbDocumentQuality, 'validation_timestamp' | 'reprocess'> {
  validation_timestamp: string | number | null
}

export interface DocumentVersion extends Omit<DbDocumentVersion, 'analyzed_at'> {
  analyzed_at: string | number | null
}

export interface VersionFamilyDocument extends Document {
  is_canonical: boolean
  is_duplicate: boolean
  is_preservation_candidate?: boolean
}

export interface VersionFamily {
  version_group_id: string
  canonical_document_id: string
  documents: VersionFamilyDocument[]
}

export interface DocumentMetadataField {
  name: string
  value: string
  value_type: string | null
}

export interface DocumentToBatch {
  id: string
  document_id: string
  batch_id: string
  added_at: Date | string | null
  batch_origin: string | null
  cost: string | null
  processing_time_seconds: number | null
  ocr_quality_low: boolean | null
  ocr_quality_medium: boolean | null
  batch_legacy_id: string | null
  batch_name: string | null
}

export interface DocumentToAuthor {
  id: string
  document_id: string
  author_id: string
  contributor_type: string | null
  notes: string | null
}

export interface Tag {
  id: string
  name: string | null
  notes: string | null
}

export interface DocumentToTag {
  id: string
  document_id: string
  tag_id: string
  notes: string | null
  tags: Tag
}

export interface AuditEntry {
  document_id: string
  field_name: string
  source_name: string
  before_value: string | null
  after_value: string | null
  changed_at: string
}

export interface ReviewConflictValue {
  source: string
  value: string
}

export interface ReviewItem {
  id: string
  document_id: string
  field_name: string
  winning_source: string
  winning_value: string | null
  conflicting_values: ReviewConflictValue[]
  status: string
  created_at: string
}

export interface DocumentDetail {
  document: Document
  quality: DocumentQuality | null
  versions: DocumentVersion[]
  version_family: VersionFamily | null
  metadata: DocumentMetadataField[]
  document_to_batches: DocumentToBatch[]
  document_to_authors: DocumentToAuthor[]
  document_to_tags: DocumentToTag[]
  audits: AuditEntry[]
  reviews: ReviewItem[]
}

export interface FailureItem extends Document {
  failure_reason?: string | null
}

export interface ReadyForLibraryItem {
  id: string
  name: string | null
  validation_status: string | null
  validation_timestamp: string | number | null
  metadata_complete: boolean
  access_level: string | null
}

export interface DocumentQueryParams {
  page?: number
}
