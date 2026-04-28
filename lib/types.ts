// Types reflecting the actual database schema.
// Only fields that exist in the actual DB are included.

export interface Document {
  id: string
  filesize: number | null
  hash_binary: string | null
  hash_content: string | null
  id_legacy: string | null
  source_id?: string | null
  name: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  is_duplicate?: boolean
}

export interface DocumentsCursor {
  id: string
  value: string
}

export interface DocumentsPageInfo {
  page: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: DocumentsCursor | null
  endCursor: DocumentsCursor | null
}

export interface DocumentsPageResult {
  data: Document[]
  pageInfo: DocumentsPageInfo
}

export interface DocumentQuality {
  id: string
  document_id: string
  comment: string | null
  comment_additional: string | null
  metadata_sufficiency: string | null
  validation_status: string | null
  validation_type: string | null
  validation_timestamp: string | number | null
  validator_name: string | null
  validator_email: string | null
  access_level: string | null
  current_status: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_group_id: string
  notes: string | null
  changes_summary: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  analyzed_at: string | number | null
}

export interface VersionFamilyDocument extends Document {
  is_canonical: boolean
  is_duplicate: boolean
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

export interface PipelineSummary {
  total: number
  by_validation_status: Record<string, number>
  /** @deprecated No state column exists on documents; always empty */
  by_state: Record<string, number>
}

export interface DocumentQueryParams {
  page?: number
}

export interface ReviewQueryParams {
  status?: string
  field?: string
  page?: number
}

export interface FailureItem extends Document {
  failure_reason?: string | null
}

export interface PagedResult<T> {
  items: T[]
  total: number
}

export interface ReviewQueueItem {
  id: string
  name: string | null
  validation_status: string | null
  validation_type: string | null
  validator_name: string | null
  validator_email: string | null
  needs_review: boolean
  sensitive: boolean
}

export interface ReadyForLibraryItem {
  id: string
  name: string | null
  validation_status: string | null
  validation_timestamp: string | number | null
  access_level: string | null
  metadata_complete: boolean
}

// BatchSummary kept as-is below
export interface BatchSummary {
  batch_id: string
  batch_name: string | null
  validation_status: string | null
  document_count: number
}
