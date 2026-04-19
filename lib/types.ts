// Types reflecting the actual database schema.
// Fields that existed in the original design but do not have corresponding DB
// columns are included as optional/nullable for backward compatibility; they
// will always be empty or null at runtime.

export interface Document {
  // Actual DB columns
  id: string;
  filename: string;
  filesize: number | null;
  filetype: string | null;
  original_url: string;
  source_id: string | null;
  hash_binary: string | null;
  hash_content: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Deprecated / non-existent columns — present for backward compat
  state?: string;
  file_folder_url?: string;
  original_parent_folder?: string | null;
  parent_id?: string | null;
  duplicates?: string[];
  collection_tags?: string[];
  ingested_at?: string | null;
  is_primary?: boolean;
  drive_file_id?: string | null;
}

export interface DocumentQuality {
  id: string;
  document_id: string;
  page_count: number | null;
  validation_type: string | null;
  validation_status: string | null;
  validator: string | null;
  validation_timestamp: string | null;
  access_level: string | null;
  content_duplication: string | null;
  final_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  canonical_document_id: string;
  hash_content: string | null;
  comments: string | null;
  changes_summary: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Metadata stored in document_to_metadata (join table, not a flat document_metadata table)
export interface MetadataRecord {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | MetadataRecord
    | MetadataRecord[]
    | string[]
    | number[]
    | boolean[];
}

export interface DocumentDetail {
  document: Document;
  // Backward compat: document_to_metadata join (via metadata table) not yet wired
  metadata: MetadataRecord | null;
  audits: AuditEntry[];
  reviews: ReviewItem[];
  quality: DocumentQuality | null;
  versions: DocumentVersion[];
}

export interface AuditEntry {
  document_id: string;
  field_name: string;
  source_name: string;
  before_value: string | null;
  after_value: string | null;
  changed_at: string;
}

export interface ReviewConflictValue {
  source: string;
  value: string;
}

export interface ReviewItem {
  id: string;
  document_id: string;
  field_name: string;
  winning_source: string;
  winning_value: string | null;
  conflicting_values: ReviewConflictValue[];
  status: string;
  created_at: string;
}

export interface PipelineSummary {
  total: number;
  // Real data from document_quality join
  by_validation_status: Record<string, number>;
  // Deprecated: no state column exists on documents; always empty
  by_state: Record<string, number>;
}

export interface DocumentQueryParams {
  state?: string;
  page?: number;
}

export interface ReviewQueryParams {
  status?: string;
  field?: string;
  page?: number;
}

export interface FailureItem extends Document {
  // Deprecated fields — documents table has no state/failure_reason
  state?: string;
  failure_reason?: string | null;
  ingested_at?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}
