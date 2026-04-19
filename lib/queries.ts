import type {
  AuditEntry,
  Document,
  DocumentDetail,
  DocumentQueryParams,
  DocumentQuality,
  FailureItem,
  PagedResult,
  PipelineSummary,
  ReviewItem,
  ReviewQueryParams,
} from "@lib/types";
import { db } from "@lib/db";

const PAGE_SIZE = 20;

function dateToString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
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

// ---------------------------------------------------------------------------
// getPipelineSummary
// Returns total document count and a breakdown by validation_status from
// document_quality.  Also includes by_state (always empty) for backward
// compat since documents.state does not exist.
// ---------------------------------------------------------------------------
export async function getPipelineSummary(): Promise<PipelineSummary> {
  const [total, qualityRows] = await Promise.all([
    db.documents.count(),
    db.document_quality.groupBy({
      by: ["validation_status"],
      _count: { _all: true },
    }),
  ]);

  const by_validation_status: Record<string, number> = {};
  for (const row of qualityRows) {
    const key = row.validation_status ?? "unknown";
    by_validation_status[key] = row._count._all;
  }

  return {
    total,
    by_validation_status,
    // Deprecated — no state column exists on documents
    by_state: {},
  };
}

// ---------------------------------------------------------------------------
// getDocuments
// The `state` filter is accepted for API stability but silently ignored because
// documents.state does not exist.
// ---------------------------------------------------------------------------
export async function getDocuments(
  params: DocumentQueryParams = {},
): Promise<PagedResult<Document>> {
  const page = normalizePageNumber(params.page);
  // params.state is silently ignored — documents.state does not exist
  const offset = (page - 1) * PAGE_SIZE;

  const [items, total] = await Promise.all([
    db.documents.findMany({
      orderBy: { created_at: "desc" },
      skip: offset,
      take: PAGE_SIZE,
    }),
    db.documents.count(),
  ]);

  return {
    items: items.map((row) => ({
      id: String(row.id),
      filename: row.filename ?? "",
      filesize: row.filesize !== null && row.filesize !== undefined
        ? Number(row.filesize)
        : null,
      filetype: row.filetype ?? null,
      original_url: row.original_url ?? "",
      source_id: row.source_id ?? null,
      hash_binary: row.hash_binary ?? null,
      hash_content: row.hash_content ?? null,
      created_at: dateToString(row.created_at),
      updated_at: dateToString(row.updated_at),
      // Deprecated fields — not stored in the DB
      state: "",
      file_folder_url: "",
      original_parent_folder: null,
      parent_id: null,
      duplicates: [],
      collection_tags: [],
      ingested_at: null,
      is_primary: false,
      drive_file_id: null,
    })),
    total,
  };
}

// ---------------------------------------------------------------------------
// getDocumentDetail
// Returns a document with its document_quality and document_versions.
// Metadata, audits, and reviews are empty stubs because those tables do not exist.
// ---------------------------------------------------------------------------
export async function getDocumentDetail(documentId: string): Promise<DocumentDetail | null> {
  const document = await db.documents.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    return null;
  }

  const [quality, versions] = await Promise.all([
    db.document_quality.findUnique({
      where: { document_id: documentId },
    }),
    db.document_versions.findMany({
      where: { document_id: documentId },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const mapQuality = (row: typeof quality): DocumentQuality | null => {
    if (!row) return null;
    return {
      id: String(row.id),
      document_id: String(row.document_id),
      page_count: row.page_count ?? null,
      validation_type: row.validation_type ?? null,
      validation_status: row.validation_status ?? null,
      validator: row.validator ?? null,
      validation_timestamp: dateToString(row.validation_timestamp),
      access_level: row.access_level ?? null,
      content_duplication: row.content_duplication ?? null,
      final_status: row.final_status ?? null,
      created_at: dateToString(row.created_at),
      updated_at: dateToString(row.updated_at),
    };
  };

  return {
    document: {
      id: String(document.id),
      filename: document.filename ?? "",
      filesize: document.filesize !== null && document.filesize !== undefined
        ? Number(document.filesize)
        : null,
      filetype: document.filetype ?? null,
      original_url: document.original_url ?? "",
      source_id: document.source_id ?? null,
      hash_binary: document.hash_binary ?? null,
      hash_content: document.hash_content ?? null,
      created_at: dateToString(document.created_at),
      updated_at: dateToString(document.updated_at),
      // Deprecated fields
      state: "",
      file_folder_url: "",
      original_parent_folder: null,
      parent_id: null,
      duplicates: [],
      collection_tags: [],
      ingested_at: null,
      is_primary: false,
      drive_file_id: null,
    },
    // document_to_metadata join exists but is not wired here; stub null
    metadata: null,
    // document_audits does not exist
    audits: [] as AuditEntry[],
    // document_reviews does not exist
    reviews: [] as ReviewItem[],
    quality: mapQuality(quality),
    versions: versions.map((v) => ({
      id: String(v.id),
      document_id: String(v.document_id),
      canonical_document_id: String(v.canonical_document_id),
      hash_content: v.hash_content ?? null,
      comments: v.comments ?? null,
      changes_summary: v.changes_summary ?? null,
      created_at: dateToString(v.created_at),
      updated_at: dateToString(v.updated_at),
    })),
  };
}

// ---------------------------------------------------------------------------
// getFailures
// Returns an empty array.  The documents table has no `state` column, so
// there is no reliable way to determine which documents have failed.
// ---------------------------------------------------------------------------
export async function getFailures(): Promise<FailureItem[]> {
  // documents table has no state column — cannot determine failures
  return await Promise.resolve([]);
}

// ---------------------------------------------------------------------------
// getDistinctCollectionTags
// Returns distinct tag names by querying the tags + document_to_tags join.
// The documents table has no `collection_tags` column.
// ---------------------------------------------------------------------------
export async function getDistinctCollectionTags(): Promise<string[]> {
  const rows = await db.tags.findMany({
    include: {
      document_to_tags: {
        select: { document_id: true },
      },
    },
  });

  const tagSet = new Set<string>();
  for (const tag of rows) {
    if (tag.document_to_tags.length > 0) {
      tagSet.add(tag.name);
    }
  }
  return Array.from(tagSet).sort();
}

// ---------------------------------------------------------------------------
// updateDocumentCollectionTags
// Returns false.  The documents table has no `collection_tags` column,
// so this operation cannot be performed.
// ---------------------------------------------------------------------------
export async function updateDocumentCollectionTags(
  _documentId: string,
  _collectionTags: string[],
): Promise<boolean> {
  // documents table has no collection_tags column — operation not supported
  return await Promise.resolve(false);
}

// ---------------------------------------------------------------------------
// getReviewQueue
// Returns an empty result.  The document_reviews table does not exist.
// ---------------------------------------------------------------------------
export async function getReviewQueue(
  _params: ReviewQueryParams = {},
): Promise<PagedResult<ReviewItem & { filename: string | null }>> {
  // document_reviews table does not exist
  return await Promise.resolve({ items: [], total: 0 });
}

// ---------------------------------------------------------------------------
// getDistinctReviewFields
// Returns an empty array.  The document_reviews table does not exist.
// ---------------------------------------------------------------------------
export async function getDistinctReviewFields(): Promise<string[]> {
  // document_reviews table does not exist
  return await Promise.resolve([]);
}
