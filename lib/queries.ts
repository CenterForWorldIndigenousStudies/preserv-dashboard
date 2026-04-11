import type { ResultSetHeader, RowDataPacket } from "mysql2";

import pool from "@/lib/db";
import type {
  AuditEntry,
  Document,
  DocumentDetail,
  DocumentQueryParams,
  FailureItem,
  MetadataRecord,
  PagedResult,
  PipelineSummary,
  ReviewConflictValue,
  ReviewItem,
  ReviewQueryParams,
} from "@/lib/types";

const PAGE_SIZE = 20;
const ALLOWED_STATES = new Set(["ingested", "normalized", "under_review", "completed", "failed"]);
const ALLOWED_REVIEW_STATUSES = new Set(["pending", "in_progress", "resolved"]);

interface DocumentRow extends RowDataPacket {
  id: string;
  filename: string;
  filesize: number | null;
  filetype: string | null;
  original_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  file_folder_url: string | null;
  original_parent_folder: string | null;
  parent_id: string | null;
  duplicates: string | null;
  collection_tags: string | null;
  state: string;
  ingested_at: string | null;
  is_primary: number | boolean;
  drive_file_id: string | null;
}

interface PipelineRow extends RowDataPacket {
  state: string;
  count: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface ReviewRow extends RowDataPacket {
  id: number;
  document_id: string;
  filename: string | null;
  field_name: string;
  winning_source: string | null;
  winning_value: string | null;
  conflicting_values: string | null;
  status: string;
  created_at: string | null;
}

interface AuditRow extends RowDataPacket {
  document_id: string;
  field_name: string;
  source_name: string;
  before_value: string | null;
  after_value: string | null;
  changed_at: string | null;
}

interface MetadataRow extends RowDataPacket {
  metadata: string | null;
}

interface FailureRow extends DocumentRow {
  metadata: string | null;
}

function parseJsonValue(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseJsonArray(value: string | null): string[] {
  const parsedValue = parseJsonValue(value);

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .filter((item: unknown): item is string => typeof item === "string")
    .map((item: string) => item.trim())
    .filter((item: string) => item.length > 0);
}

function parseConflictValues(value: string | null): ReviewConflictValue[] {
  const parsedValue = parseJsonValue(value);

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .map((item: unknown) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const source = "source" in item && typeof item.source === "string" ? item.source : "unknown";
      const conflictValue = "value" in item && typeof item.value === "string" ? item.value : "";

      return {
        source,
        value: conflictValue,
      };
    })
    .filter((item: ReviewConflictValue | null): item is ReviewConflictValue => item !== null);
}

function normalizeDocumentRow(row: DocumentRow): Document {
  return {
    id: row.id,
    filename: row.filename,
    filesize: row.filesize,
    filetype: row.filetype,
    original_url: row.original_url ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    file_folder_url: row.file_folder_url ?? "",
    original_parent_folder: row.original_parent_folder,
    parent_id: row.parent_id,
    duplicates: parseJsonArray(row.duplicates),
    collection_tags: parseJsonArray(row.collection_tags),
    state: row.state,
    ingested_at: row.ingested_at,
    is_primary: Boolean(row.is_primary),
    drive_file_id: row.drive_file_id,
  };
}

function normalizeReviewRow(row: ReviewRow): ReviewItem {
  return {
    id: row.id,
    document_id: row.document_id,
    field_name: row.field_name,
    winning_source: row.winning_source ?? "",
    winning_value: row.winning_value,
    conflicting_values: parseConflictValues(row.conflicting_values),
    status: row.status,
    created_at: row.created_at ?? "",
  };
}

function normalizeAuditRow(row: AuditRow): AuditEntry {
  return {
    document_id: row.document_id,
    field_name: row.field_name,
    source_name: row.source_name,
    before_value: row.before_value,
    after_value: row.after_value,
    changed_at: row.changed_at ?? "",
  };
}

function parseMetadata(value: string | null): MetadataRecord | null {
  const parsedValue = parseJsonValue(value);

  if (typeof parsedValue !== "object" || parsedValue === null || Array.isArray(parsedValue)) {
    return null;
  }

  return parsedValue as MetadataRecord;
}

function deriveFailureReason(metadata: string | null): string | null {
  const parsedMetadata = parseMetadata(metadata);

  if (!parsedMetadata) {
    return null;
  }

  const candidateKeys = ["failure_reason", "error", "message", "reason"];

  for (const key of candidateKeys) {
    const candidateValue = parsedMetadata[key];

    if (typeof candidateValue === "string" && candidateValue.trim().length > 0) {
      return candidateValue;
    }
  }

  return null;
}

function normalizePageNumber(page?: number): number {
  if (!page || page < 1 || Number.isNaN(page)) {
    return 1;
  }

  return Math.floor(page);
}

export function getPageSize(): number {
  return PAGE_SIZE;
}

export async function getPipelineSummary(): Promise<PipelineSummary> {
  const [totalRows] = await pool.execute<CountRow[]>("SELECT COUNT(*) AS total FROM documents");
  const [stateRows] = await pool.execute<PipelineRow[]>(
    "SELECT state, COUNT(*) AS count FROM documents GROUP BY state",
  );

  const byState: Record<string, number> = {
    ingested: 0,
    normalized: 0,
    under_review: 0,
    completed: 0,
    failed: 0,
  };

  for (const row of stateRows) {
    byState[row.state] = row.count;
  }

  return {
    total: totalRows[0]?.total ?? 0,
    by_state: byState,
  };
}

export async function getDocuments(params: DocumentQueryParams = {}): Promise<PagedResult<Document>> {
  const page = normalizePageNumber(params.page);
  const state = params.state && ALLOWED_STATES.has(params.state) ? params.state : undefined;
  const offset = (page - 1) * PAGE_SIZE;
  const whereClause = state ? "WHERE state = ?" : "";
  const whereParams: Array<string | number> = state ? [state] : [];

  const [countRows] = await pool.execute<CountRow[]>(
    `SELECT COUNT(*) AS total FROM documents ${whereClause}`,
    whereParams,
  );

  const [documentRows] = await pool.execute<DocumentRow[]>(
    `
      SELECT
        id,
        filename,
        filesize,
        filetype,
        original_url,
        created_at,
        updated_at,
        file_folder_url,
        original_parent_folder,
        parent_id,
        duplicates,
        collection_tags,
        state,
        ingested_at,
        is_primary,
        drive_file_id
      FROM documents
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...whereParams, PAGE_SIZE, offset],
  );

  return {
    items: documentRows.map(normalizeDocumentRow),
    total: countRows[0]?.total ?? 0,
  };
}

export async function getReviewQueue(
  params: ReviewQueryParams = {},
): Promise<PagedResult<ReviewItem & { filename: string | null }>> {
  const page = normalizePageNumber(params.page);
  const status = params.status && ALLOWED_REVIEW_STATUSES.has(params.status) ? params.status : undefined;
  const field = params.field?.trim() ? params.field.trim() : undefined;
  const offset = (page - 1) * PAGE_SIZE;

  const filters: string[] = [];
  const queryParams: Array<string | number> = [];

  if (status) {
    filters.push("r.status = ?");
    queryParams.push(status);
  }

  if (field) {
    filters.push("r.field_name = ?");
    queryParams.push(field);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const [countRows] = await pool.execute<CountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM document_reviews r
      ${whereClause}
    `,
    queryParams,
  );

  const [reviewRows] = await pool.execute<ReviewRow[]>(
    `
      SELECT
        r.id,
        r.document_id,
        d.filename,
        r.field_name,
        r.winning_source,
        r.winning_value,
        r.conflicting_values,
        r.status,
        r.created_at
      FROM document_reviews r
      INNER JOIN documents d ON d.id = r.document_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...queryParams, PAGE_SIZE, offset],
  );

  return {
    items: reviewRows.map((row) => ({
      ...normalizeReviewRow(row),
      filename: row.filename,
    })),
    total: countRows[0]?.total ?? 0,
  };
}

export async function getDistinctReviewFields(): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `
      SELECT DISTINCT field_name
      FROM document_reviews
      WHERE field_name IS NOT NULL AND field_name <> ''
      ORDER BY field_name ASC
    `,
  );

  return rows
    .map((row) => row.field_name)
    .filter((fieldName: unknown): fieldName is string => typeof fieldName === "string");
}

export async function getDocumentDetail(documentId: string): Promise<DocumentDetail | null> {
  const [documentRows] = await pool.execute<DocumentRow[]>(
    `
      SELECT
        id,
        filename,
        filesize,
        filetype,
        original_url,
        created_at,
        updated_at,
        file_folder_url,
        original_parent_folder,
        parent_id,
        duplicates,
        collection_tags,
        state,
        ingested_at,
        is_primary,
        drive_file_id
      FROM documents
      WHERE id = ?
      LIMIT 1
    `,
    [documentId],
  );

  const documentRow = documentRows[0];

  if (!documentRow) {
    return null;
  }

  const [metadataRows] = await pool.execute<MetadataRow[]>(
    `
      SELECT metadata
      FROM document_metadata
      WHERE document_id = ?
      LIMIT 1
    `,
    [documentId],
  );

  const [auditRows] = await pool.execute<AuditRow[]>(
    `
      SELECT document_id, field_name, source_name, before_value, after_value, changed_at
      FROM document_audits
      WHERE document_id = ?
      ORDER BY changed_at DESC
    `,
    [documentId],
  );

  const [reviewRows] = await pool.execute<ReviewRow[]>(
    `
      SELECT
        id,
        document_id,
        NULL AS filename,
        field_name,
        winning_source,
        winning_value,
        conflicting_values,
        status,
        created_at
      FROM document_reviews
      WHERE document_id = ?
      ORDER BY created_at DESC
    `,
    [documentId],
  );

  return {
    document: normalizeDocumentRow(documentRow),
    metadata: parseMetadata(metadataRows[0]?.metadata ?? null),
    audits: auditRows.map(normalizeAuditRow),
    reviews: reviewRows.map(normalizeReviewRow),
  };
}

export async function getFailures(): Promise<FailureItem[]> {
  const [rows] = await pool.execute<FailureRow[]>(
    `
      SELECT
        d.id,
        d.filename,
        d.filesize,
        d.filetype,
        d.original_url,
        d.created_at,
        d.updated_at,
        d.file_folder_url,
        d.original_parent_folder,
        d.parent_id,
        d.duplicates,
        d.collection_tags,
        d.state,
        d.ingested_at,
        d.is_primary,
        d.drive_file_id,
        m.metadata
      FROM documents d
      LEFT JOIN document_metadata m ON m.document_id = d.id
      WHERE d.state = ?
      ORDER BY d.ingested_at DESC
    `,
    ["failed"],
  );

  return rows.map((row) => ({
    ...normalizeDocumentRow(row),
    failure_reason: deriveFailureReason(row.metadata),
  }));
}

export async function getDistinctCollectionTags(): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `
      SELECT DISTINCT collection_tags
      FROM documents
      WHERE collection_tags IS NOT NULL AND collection_tags <> '[]' AND collection_tags <> ''
    `,
  );

  const tagSet = new Set<string>();
  for (const row of rows) {
    const tags = parseJsonArray(row.collection_tags);
    for (const tag of tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

export async function updateDocumentCollectionTags(
  documentId: string,
  collectionTags: string[],
): Promise<boolean> {
  const [result] = await pool.execute(
    "UPDATE documents SET collection_tags = ? WHERE id = ?",
    [JSON.stringify(collectionTags), documentId],
  );

  const affected = (result as ResultSetHeader).affectedRows;
  return affected > 0;
}
