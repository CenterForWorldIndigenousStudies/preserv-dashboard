// Types reflecting the actual database schema.
// Only fields that exist in the actual DB are included.

export interface Document {
  id: string;
  filesize: number | null;
  hash_binary: string | null;
  hash_content: string | null;
  id_legacy: string | null;
  source_id: string | null;
  name: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

export interface DocumentQuality {
  id: string;
  document_id: string;
  comment: string | null;
  comment_additional: string | null;
  metadata_sufficiency: string | null;
  validation_status: string | null;
  validation_type: string | null;
  validation_timestamp: string | null;
  validator_name: string | null;
  validator_email: string | null;
  access_level: string | null;
  current_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  canonical_document_id: string;
  notes: string | null;
  changes_summary: string | null;
  created_at: string | null;
  updated_at: string | null;
  analyzed_at: string | null;
}

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
  by_validation_status: Record<string, number>;
  /** @deprecated No state column exists on documents; always empty */
  by_state: Record<string, number>;
}

export interface DocumentQueryParams {
  page?: number;
}

export interface ReviewQueryParams {
  status?: string;
  field?: string;
  page?: number;
}

export interface FailureItem extends Document {
  failure_reason?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}
