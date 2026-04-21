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

// Fields on the documents model used for orderBy/filtering
const DOCUMENTS_ORDERABLE_FIELDS = [
  "id",
  "filesize",
  "source_id",
  "hash_binary",
  "hash_content",
  "id_legacy",
  "name",
  "created_at",
  "updated_at",
] as const;

export interface DocumentsQueryParams {
  page?: number;
  pageSize?: number;
  orderBy?: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number];
  sortDirection?: "asc" | "desc";
  search?: string;
}

export async function getAllDocuments(
  params: DocumentsQueryParams = {},
): Promise<{ data: Document[]; total: number }> {
  const page = normalizePageNumber(params.page);
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 1000) : 25;
  const skip = (page - 1) * pageSize;

  // Build orderBy
  let orderBy: Record<string, "asc" | "desc"> | undefined;
  if (params.orderBy && (DOCUMENTS_ORDERABLE_FIELDS as readonly string[]).includes(params.orderBy)) {
    orderBy = { [params.orderBy]: params.sortDirection === "desc" ? "desc" : "asc" };
  } else {
    orderBy = { created_at: "desc" };
  }

  // Build where clause for global search
  const where: Record<string, unknown> = {};
  if (params.search && params.search.trim()) {
    const searchTerm = params.search.trim();
    where.OR = [
      { name: { contains: searchTerm } },
      { source_id: { contains: searchTerm } },
      { hash_binary: { contains: searchTerm } },
      { hash_content: { contains: searchTerm } },
      { id_legacy: { contains: searchTerm } },
    ];
  }

  const [items, total] = await Promise.all([
    db.documents.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    db.documents.count({ where }),
  ]);

  return {
    data: items.map((row) => ({
      id: String(row.id),
      filesize: row.filesize !== null && row.filesize !== undefined
        ? Number(row.filesize)
        : null,
      hash_binary: row.hash_binary ?? null,
      hash_content: row.hash_content ?? null,
      id_legacy: row.id_legacy ?? null,
      source_id: row.source_id ?? null,
      name: row.name ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    })),
    total,
  };
}

const PAGE_SIZE = 20;

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
    by_state: {},
  };
}

// ---------------------------------------------------------------------------
// getDocuments
// ---------------------------------------------------------------------------
export async function getDocuments(
  params: DocumentQueryParams = {},
): Promise<PagedResult<Document>> {
  const page = normalizePageNumber(params.page);
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
      filesize: row.filesize !== null && row.filesize !== undefined
        ? Number(row.filesize)
        : null,
      hash_binary: row.hash_binary ?? null,
      hash_content: row.hash_content ?? null,
      id_legacy: row.id_legacy ?? null,
      source_id: row.source_id ?? null,
      name: row.name ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
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
      comment: row.comment ?? null,
      comment_additional: row.comment_additional ?? null,
      metadata_sufficiency: row.metadata_sufficiency ?? null,
      validation_status: row.validation_status ?? null,
      validation_type: row.validation_type ?? null,
      validation_timestamp: dateToString(row.validation_timestamp),
      validator_name: row.validator_name ?? null,
      validator_email: row.validator_email ?? null,
      access_level: row.access_level ?? null,
      current_status: row.current_status ?? null,
      created_at: dateToString(row.created_at),
      updated_at: dateToString(row.updated_at),
    };
  };

  return {
    document: {
      id: String(document.id),
      filesize: document.filesize !== null && document.filesize !== undefined
        ? Number(document.filesize)
        : null,
      hash_binary: document.hash_binary ?? null,
      hash_content: document.hash_content ?? null,
      id_legacy: document.id_legacy ?? null,
      source_id: document.source_id ?? null,
      name: document.name ?? null,
      created_at: document.created_at ?? null,
      updated_at: document.updated_at ?? null,
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
      version_group_id: String(v.version_group_id),
      notes: v.notes ?? null,
      changes_summary: v.changes_summary ?? null,
      created_at: dateToString(v.created_at),
      updated_at: dateToString(v.updated_at),
      analyzed_at: dateToString(v.analyzed_at),
    })),
  };
}

function dateToString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
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
): Promise<PagedResult<ReviewItem>> {
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
