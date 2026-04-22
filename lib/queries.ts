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
  ReviewQueueItem,
  ReadyForLibraryItem,
  BatchSummary,
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

  const [quality, versions, metadata, batches, authors, tags] = await Promise.all([
    db.document_quality.findUnique({
      where: { document_id: documentId },
    }),
    db.document_versions.findMany({
      where: { document_id: documentId },
      orderBy: { created_at: "desc" },
    }),
    db.document_to_metadata.findMany({
      where: { document_id: documentId },
      include: { metadata: true },
      orderBy: { metadata: { name: "asc" } },
    }),
    db.document_to_batches.findMany({
      where: { document_id: documentId },
    }),
    db.document_to_authors.findMany({
      where: { document_id: documentId },
    }),
    db.document_to_tags.findMany({
      where: { document_id: documentId },
      include: { tags: true },
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
    metadata: metadata.map((m) => ({
      name: m.metadata.name,
      value: String(m.value ?? ""),
      value_type: m.value_type ?? null,
    })),
    document_to_batches: batches.map((b) => ({
      id: String(b.id),
      document_id: String(b.document_id),
      batch_id: String(b.batch_id),
      added_at: dateToString(b.added_at),
      cost: b.cost !== null ? String(b.cost) : null,
      processing_time_seconds: b.processing_time_seconds ?? null,
      ocr_quality_low: b.ocr_quality_low ?? null,
      ocr_quality_medium: b.ocr_quality_medium ?? null,
    })),
    document_to_authors: authors.map((a) => ({
      id: String(a.id),
      document_id: String(a.document_id),
      author_id: String(a.author_id),
      contributor_type: a.contributor_type ?? null,
      notes: a.notes ?? null,
    })),
    document_to_tags: tags.map((t) => ({
      id: String(t.id),
      document_id: String(t.document_id),
      tag_id: String(t.tag_id),
      notes: t.notes ?? null,
      tags: {
        id: String(t.tags.id),
        name: t.tags.name ?? null,
        notes: t.tags.notes ?? null,
      },
    })),
    audits: [] as AuditEntry[],
    reviews: [] as ReviewItem[],
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

// ---------------------------------------------------------------------------
// getReviewQueueDocuments
// Returns documents with validation_status IN ('IN_PROGRESS', 'NEEDS_REVISION')
// OR documents that have a 'needs_review' metadata flag OR 'sensitive' metadata TRUE.
// ---------------------------------------------------------------------------
export async function getReviewQueueDocuments(): Promise<{
  items: ReviewQueueItem[];
  total: number;
}> {
  // Find metadata ids for 'needs_review' and 'sensitive'
  const [needsReviewMeta, sensitiveMeta] = await Promise.all([
    db.metadata.findFirst({ where: { name: "needs_review" } }),
    db.metadata.findFirst({ where: { name: "sensitive" } }),
  ]);

  const needsReviewMetaId = needsReviewMeta?.id;
  const sensitiveMetaId = sensitiveMeta?.id;

  // Get documents with IN_PROGRESS or NEEDS_REVISION validation_status
  const qualityDocs = await db.document_quality.findMany({
    where: {
      validation_status: {
        in: ["IN_PROGRESS", "NEEDS_REVISION"],
      },
    },
    select: { document_id: true },
  });

  const qualityDocIds = new Set(qualityDocs.map((d) => d.document_id));

  // Get documents with needs_review or sensitive metadata
  const metadataFilters: { metadata_id: string; value: { notIn: string[] } }[] = [];
  if (needsReviewMetaId) {
    metadataFilters.push({ metadata_id: needsReviewMetaId, value: { notIn: ["", "false", "0", "no"] } });
  }
  if (sensitiveMetaId) {
    metadataFilters.push({ metadata_id: sensitiveMetaId, value: { notIn: ["", "false", "0", "no"] } });
  }

  let metadataDocIds = new Set<string>();
  if (metadataFilters.length > 0) {
    const metadataRows = await db.document_to_metadata.findMany({
      where: {
        OR: metadataFilters,
      },
      select: { document_id: true },
    });
    metadataDocIds = new Set(metadataRows.map((r) => r.document_id));
  }

  // Union of quality doc IDs and metadata doc IDs
  const allDocIds = new Set([...qualityDocIds, ...metadataDocIds]);


  if (allDocIds.size === 0) {
    return { items: [], total: 0 };
  }

  const documents = await db.documents.findMany({
    where: { id: { in: [...allDocIds] } },
    include: { document_quality: true, document_to_metadata: true },
  });

  const items: ReviewQueueItem[] = documents.map((doc) => {
    const q = doc.document_quality;
    // Determine needs_review and sensitive from metadata
    const needsReview = doc.document_to_metadata.some(
      (m) => m.metadata_id === needsReviewMetaId && m.value && !["", "false", "0", "no"].includes(m.value),
    );
    const sensitive = doc.document_to_metadata.some(
      (m) => m.metadata_id === sensitiveMetaId && m.value && !["", "false", "0", "no"].includes(m.value),
    );
    return {
      id: String(doc.id),
      name: doc.name ?? null,
      validation_status: q?.validation_status ?? null,
      validation_type: q?.validation_type ?? null,
      validator_name: q?.validator_name ?? null,
      validator_email: q?.validator_email ?? null,
      needs_review: needsReview,
      sensitive,
    };
  });

  return { items, total: items.length };
}

// ---------------------------------------------------------------------------
// getReadyForLibraryDocuments
// Returns documents with validation_status = 'APPROVED', access_level set,
// and required Dublin Core metadata fields present.
// ---------------------------------------------------------------------------
export async function getReadyForLibraryDocuments(): Promise<{
  items: ReadyForLibraryItem[];
  total: number;
}> {
  const requiredDcFields = ["dc_title", "dc_type", "dc_subject", "dc_rights"];

  const dcMetadata = await db.metadata.findMany({
    where: { name: { in: requiredDcFields } },
    select: { id: true, name: true },
  });

  const dcMetaMap = new Map(dcMetadata.map((m) => [m.id, m.name]));
  const dcMetaIds = new Set(dcMetadata.map((m) => m.id));

  const qualityDocs = await db.document_quality.findMany({
    where: {
      validation_status: "APPROVED",
      access_level: { not: null },
    },
    select: { document_id: true, validation_status: true, validation_timestamp: true, access_level: true },
  });

  if (qualityDocs.length === 0) {
    return { items: [], total: 0 };
  }

  const approvedDocIds = new Set(qualityDocs.map((d) => d.document_id));

  const metadataRows = await db.document_to_metadata.findMany({
    where: {
      document_id: { in: [...approvedDocIds] },
      metadata_id: { in: [...dcMetaIds] },
    },
    select: { document_id: true, metadata_id: true },
  });

  // Group by document_id and check which have all required fields
  const docDcFields = new Map<string, Set<string>>();
  for (const row of metadataRows) {
    const metaName = dcMetaMap.get(row.metadata_id);
    if (!metaName) continue;
    if (!docDcFields.has(row.document_id)) {
      docDcFields.set(row.document_id, new Set());
    }
    docDcFields.get(row.document_id)!.add(metaName);
  }

  const items: ReadyForLibraryItem[] = [];
  for (const qd of qualityDocs) {
    const dcFieldsPresent = docDcFields.get(qd.document_id);
    const metadata_complete =
      dcFieldsPresent !== undefined && requiredDcFields.every((f) => dcFieldsPresent.has(f));
    items.push({
      id: qd.document_id,
      name: null, // name loaded separately below if needed
      validation_status: qd.validation_status ?? null,
      validation_timestamp: dateToString(qd.validation_timestamp),
      access_level: qd.access_level ?? null,
      metadata_complete,
    });
  }

  // Hydrate names from documents table
  const docRows = await db.documents.findMany({
    where: { id: { in: [...approvedDocIds] } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(docRows.map((d) => [d.id, d.name ?? null]));

  for (const item of items) {
    item.name = nameMap.get(item.id) ?? null;
  }

  return { items, total: items.length };
}

// ---------------------------------------------------------------------------
// getBatchSummary
// Returns pipeline summary grouped by batch — counts of documents per
// validation_status per batch.
// ---------------------------------------------------------------------------
export async function getBatchSummary(): Promise<BatchSummary[]> {
  const rows = await db.batches.findMany({
    include: {
      document_to_batches: {
        include: {
          documents: {
            include: {
              document_quality: {
                select: { validation_status: true },
              },
            },
          },
        },
      },
    },
  });

  const result: BatchSummary[] = [];

  for (const batch of rows) {
    const byStatus = new Map<string, number>();
    for (const dtb of batch.document_to_batches) {
      const status = dtb.documents.document_quality?.validation_status ?? null;
      const key = status ?? "unknown";
      byStatus.set(key, (byStatus.get(key) ?? 0) + 1);
    }
    for (const [validation_status, document_count] of byStatus) {
      result.push({
        batch_id: batch.id,
        batch_name: batch.name ?? null,
        validation_status,
        document_count,
      });
    }
  }

  return result;
}
