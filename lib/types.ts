export interface Document {
  id: string;
  filename: string;
  filesize: number | null;
  filetype: string | null;
  original_url: string;
  created_at: string | null;
  updated_at: string | null;
  file_folder_url: string;
  original_parent_folder: string | null;
  parent_id: string | null;
  duplicates: string[];
  collection_tags: string[];
  state: string;
  ingested_at: string | null;
  is_primary: boolean;
  drive_file_id: string | null;
}

export interface ReviewConflictValue {
  source: string;
  value: string;
}

export interface ReviewItem {
  id: number;
  document_id: string;
  field_name: string;
  winning_source: string;
  winning_value: string | null;
  conflicting_values: ReviewConflictValue[];
  status: string;
  created_at: string;
}

export interface AuditEntry {
  document_id: string;
  field_name: string;
  source_name: string;
  before_value: string | null;
  after_value: string | null;
  changed_at: string;
}

export interface PipelineSummary {
  total: number;
  by_state: Record<string, number>;
}

export interface ReviewQueryParams {
  status?: string;
  field?: string;
  page?: number;
}

export interface DocumentQueryParams {
  state?: string;
  page?: number;
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
}

export interface FailureItem extends Document {
  failure_reason: string | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}
