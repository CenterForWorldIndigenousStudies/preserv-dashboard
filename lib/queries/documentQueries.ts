import { normalizeReviewQueueChecklist } from '@constants/reviewQueueChecklist'
import { NEEDS_REVIEW_METADATA_NAME } from '@constants/documentMetadata'
import { db } from '@lib/db'
import { calculateTotalProcessingCost } from '@lib/processingCost'
import { composeReviewQueueReasons } from '@lib/needsReview'
import { evaluateDocumentReadiness } from '@lib/pipelineReadiness'
import { parseMetadataValue } from '@lib/metadata'
import { resolveBatchSearchIds, resolveTagSearchIds } from '@lib/queries/searchResolvers'
import {
  getOverviewDocumentsPage,
  isTruthyMetadataValue,
  normalizePageNumber,
  type QueryDbClient,
} from '@lib/queries/documentQuerySupport'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeStatuses,
  normalizeTextFilter,
  type AdvancedSearchFilters,
} from '@lib/search'
import type {
  Document,
  DocumentDetail,
  DocumentQuality,
  DocumentQueryParams,
  DocumentReadiness,
  VersionFamily,
  VersionFamilyDocument,
} from 'types/documents'
import type { DocumentsPageResult, PagedResult } from 'types/pagination'

const DOCUMENT_TABLE_PAGE_SIZES = [25, 50, 100, 250, 500] as const
const DEFAULT_DOCUMENT_TABLE_PAGE_SIZE: (typeof DOCUMENT_TABLE_PAGE_SIZES)[number] = 25

export interface DocumentsQueryParams extends AdvancedSearchFilters {
  page?: number
  pageSize?: number
  orderBy?:
    | 'id'
    | 'filesize'
    | 'hash_binary'
    | 'hash_content'
    | 'id_legacy'
    | 'source_id'
    | 'name'
    | 'created_at'
    | 'updated_at'
    | 'is_duplicate'
  sortDirection?: 'asc' | 'desc'
  search?: string
  requireValidationStatus?: boolean
  cursorValue?: string
  cursorId?: string
  cursorDirection?: 'next' | 'prev'
}

export function normalizeDocumentTablePageSize(pageSize?: number): number {
  if (!pageSize || pageSize < 1 || Number.isNaN(pageSize)) {
    return DEFAULT_DOCUMENT_TABLE_PAGE_SIZE
  }

  const normalizedPageSize = Math.floor(pageSize)
  let resolvedPageSize: (typeof DOCUMENT_TABLE_PAGE_SIZES)[number] = DEFAULT_DOCUMENT_TABLE_PAGE_SIZE

  for (const supportedPageSize of DOCUMENT_TABLE_PAGE_SIZES) {
    if (normalizedPageSize < supportedPageSize) {
      break
    }

    resolvedPageSize = supportedPageSize
  }

  return resolvedPageSize
}

const PAGE_SIZE = 20

export async function getAllDocuments(
  params: DocumentsQueryParams = {},
  client: QueryDbClient = db,
): Promise<DocumentsPageResult> {
  const page = normalizePageNumber(params.page)
  const pageSize = normalizeDocumentTablePageSize(params.pageSize)

  return getOverviewDocumentsPage(
    {
      page,
      pageSize,
      orderBy: params.orderBy,
      sortDirection: params.sortDirection,
      contributor: normalizeTextFilter(params.contributor ?? params.search),
      publisher: normalizeTextFilter(params.publisher),
      tagIds: await resolveTagSearchIds(normalizeTextFilter(params.tag), client),
      statuses: normalizeStatuses(params.statuses),
      documentType: normalizeDocumentType(params.documentType),
      batchIds: await resolveBatchSearchIds(normalizeTextFilter(params.batch), client),
      createdFrom: normalizeDateFilter(params.createdFrom),
      createdTo: normalizeDateFilter(params.createdTo),
      collection: normalizeTextFilter(params.collection),
      accessLevel: normalizeAccessLevel(params.accessLevel),
      requireValidationStatus: params.requireValidationStatus,
      cursor: params.cursorValue && params.cursorId ? { value: params.cursorValue, id: params.cursorId } : null,
      cursorDirection: params.cursorDirection,
    },
    client,
  )
}

export async function getDocuments(
  params: DocumentQueryParams = {},
  client: QueryDbClient = db,
): Promise<PagedResult<Document>> {
  const page = normalizePageNumber(params.page)
  const result = await getOverviewDocumentsPage(
    {
      page,
      pageSize: PAGE_SIZE,
      orderBy: 'created_at',
      sortDirection: 'desc',
    },
    client,
  )

  return {
    items: result.data,
    total: result.data.length,
  }
}

export function normalizeDocumentAccessLevels(levels: readonly (string | null | undefined)[]): string[] {
  return levels
    .filter((level): level is string => Boolean(level?.trim()))
    .map((level) => level.trim())
    .sort((left, right) => left.localeCompare(right))
}

function formatAuditValue(rawValue: string | null): string | null {
  if (rawValue === null) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(rawValue)
    if (parsed && typeof parsed === 'object' && 'value' in parsed) {
      const value = (parsed as { value?: unknown }).value
      if (value === null || value === undefined) {
        return null
      }
      return typeof value === 'string' ? value : JSON.stringify(value)
    }
  } catch {
    return rawValue
  }

  return rawValue
}

function getAuditFieldName(previousValue: string | null, newValue: string | null, editSummary: string | null): string {
  for (const rawValue of [previousValue, newValue]) {
    if (!rawValue) continue

    try {
      const parsed: unknown = JSON.parse(rawValue)
      if (parsed && typeof parsed === 'object' && 'fieldName' in parsed) {
        const fieldName = (parsed as { fieldName?: unknown }).fieldName
        if (typeof fieldName === 'string' && fieldName.length > 0) {
          return fieldName
        }
      }
    } catch {
      continue
    }
  }

  return editSummary ?? 'Document edit'
}

export async function getDocumentDetail(documentId: string): Promise<DocumentDetail | null> {
  const document = await db.documents.findUnique({
    where: { id: documentId },
  })

  if (!document) {
    return null
  }

  const [
    quality,
    versions,
    metadata,
    batches,
    contributors,
    publishers,
    tags,
    canonicalGroup,
    variantMemberships,
    accessRows,
    stateHistoryRows,
    auditRows,
  ] = await Promise.all([
    db.document_quality.findUnique({
      where: { document_id: documentId },
    }),
    db.document_versions.findMany({
      where: { document_id: documentId },
      orderBy: { created_at: 'desc' },
    }),
    db.document_to_metadata.findMany({
      where: { document_id: documentId },
      include: { metadata: true },
      orderBy: { metadata: { name: 'asc' } },
    }),
    db.document_to_batches.findMany({
      where: { document_id: documentId },
      include: {
        batches: {
          include: {
            _count: { select: { document_to_batches: true } },
          },
        },
      },
    }),
    db.document_to_contributors.findMany({
      where: { document_id: documentId },
      include: { contributors: true },
    }),
    db.document_to_publishers.findMany({
      where: { document_id: documentId },
      include: { publishers: true },
    }),
    db.document_to_tags.findMany({
      where: { document_id: documentId },
      include: { tags: true },
    }),
    db.version_groups.findUnique({
      where: { canonical_document_id: documentId },
      include: {
        documents: {
          include: {
            document_to_metadata: {
              include: { metadata: true },
            },
            document_to_tags: {
              include: { tags: true },
            },
          },
        },
        document_versions: {
          include: {
            documents: {
              include: {
                document_to_metadata: {
                  include: { metadata: true },
                },
                document_to_tags: {
                  include: { tags: true },
                },
              },
            },
          },
        },
      },
    }),
    db.document_versions.findMany({
      where: { document_id: documentId },
      include: {
        version_groups: {
          include: {
            documents: {
              include: {
                document_to_metadata: {
                  include: { metadata: true },
                },
                document_to_tags: {
                  include: { tags: true },
                },
              },
            },
            document_versions: {
              include: {
                documents: {
                  include: {
                    document_to_metadata: {
                      include: { metadata: true },
                    },
                    document_to_tags: {
                      include: { tags: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    db.document_access.findMany({
      where: { document_id: documentId },
      select: { access_levels: { select: { level_name: true } } },
    }),
    db.state_history.findMany({
      where: { document_id: documentId },
      orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
    }),
    db.edit_history.findMany({
      where: { entity_table: 'documents', entity_id: documentId },
      orderBy: [{ edited_at: 'desc' }, { id: 'desc' }],
    }),
  ])

  const access_levels = normalizeDocumentAccessLevels(accessRows.map((row) => row.access_levels.level_name))
  const readinessResult = await evaluateDocumentReadiness(documentId).catch(() => null)
  const readiness: DocumentReadiness | null = readinessResult
    ? {
        isPreservationCandidate: readinessResult.isPreservationCandidate,
        ...readinessResult.evaluation,
        reasonGroups: readinessResult.evaluation.reasonGroups.map((group) => ({
          ...group,
          serviceLabel: group.serviceKey,
        })),
      }
    : null
  const activeReviewValue = metadata.find((row) => row.metadata.name === NEEDS_REVIEW_METADATA_NAME)?.value
  const reviewReasons = composeReviewQueueReasons(activeReviewValue, quality?.validation_status)

  const mapQuality = (row: typeof quality): DocumentQuality | null => {
    if (!row) return null
    return {
      id: String(row.id),
      document_id: String(row.document_id),
      comment: row.comment ?? null,
      comment_additional: row.comment_additional ?? null,
      validation_status: row.validation_status ?? null,
      validation_timestamp:
        row.validation_timestamp !== null && row.validation_timestamp !== undefined
          ? Number(row.validation_timestamp)
          : null,
      validator_name: row.validator_name ?? null,
      validator_email: row.validator_email ?? null,
      review_checklist: row.review_checklist === null ? null : normalizeReviewQueueChecklist(row.review_checklist),
      current_status: row.current_status ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    }
  }

  const mapVersionFamilyDocument = (
    row: {
      id: string
      filesize: bigint | number | null
      hash_binary: string | null
      hash_content: string | null
      id_legacy: string | null
      name: string | null
      created_at: Date | null
      updated_at: Date | null
      document_to_tags: Array<{ tags: { name: string } }>
      document_to_metadata?: Array<{
        value: string | null
        value_type: string | null
        metadata: { name: string }
      }>
    },
    isCanonical: boolean,
  ): VersionFamilyDocument => {
    const sourceIdMetadata = row.document_to_metadata?.find(
      (metadataLink) => metadataLink.metadata.name === 'source_id',
    )
    const sourceId = sourceIdMetadata
      ? parseMetadataValue(sourceIdMetadata.value, sourceIdMetadata.value_type).plainText || null
      : null

    return {
      id: String(row.id),
      filesize: row.filesize !== null && row.filesize !== undefined ? Number(row.filesize) : null,
      hash_binary: row.hash_binary ?? null,
      hash_content: row.hash_content ?? null,
      id_legacy: row.id_legacy ?? null,
      source_id: sourceId,
      name: row.name ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      is_canonical: isCanonical,
      is_preservation_candidate:
        row.document_to_metadata?.some(
          (metadataLink) =>
            metadataLink.metadata.name === 'preservation_candidate' && isTruthyMetadataValue(metadataLink.value),
        ) ?? false,
      is_duplicate: row.document_to_tags.some((tagLink) => tagLink.tags.name === 'duplicate_document'),
    }
  }

  const mapVersionFamily = (): VersionFamily | null => {
    const group = canonicalGroup ?? variantMemberships[0]?.version_groups ?? null
    if (!group) {
      return null
    }

    const canonicalDocument = mapVersionFamilyDocument(group.documents, true)
    const familyDocumentsById = new Map<string, VersionFamilyDocument>([[canonicalDocument.id, canonicalDocument]])
    for (const versionRow of group.document_versions) {
      const mapped = mapVersionFamilyDocument(versionRow.documents, false)
      if (mapped.id === canonicalDocument.id) {
        continue
      }
      familyDocumentsById.set(mapped.id, mapped)
    }

    return {
      version_group_id: String(group.id),
      canonical_document_id: String(group.canonical_document_id),
      documents: Array.from(familyDocumentsById.values()),
    }
  }

  const hasDuplicateTag = tags.some((tagLink) => tagLink.tags.name === 'duplicate_document')

  return {
    document: {
      id: String(document.id),
      filesize: document.filesize !== null && document.filesize !== undefined ? Number(document.filesize) : null,
      hash_binary: document.hash_binary ?? null,
      hash_content: document.hash_content ?? null,
      id_legacy: document.id_legacy ?? null,
      name: document.name ?? null,
      validation_status: quality?.validation_status ?? null,
      created_at: document.created_at ?? null,
      updated_at: document.updated_at ?? null,
      is_duplicate: hasDuplicateTag,
      ...(reviewReasons.length > 0 ? { needs_review_reasons: reviewReasons } : {}),
    },
    readiness,
    quality: mapQuality(quality),
    access_levels,
    versions: versions.map((v) => ({
      id: String(v.id),
      document_id: String(v.document_id),
      version_group_id: String(v.version_group_id),
      notes: v.notes ?? null,
      changes_summary: v.changes_summary ?? null,
      similarity_score: v.similarity_score ?? null,
      created_at: v.created_at ?? null,
      updated_at: v.updated_at ?? null,
      analyzed_at: v.analyzed_at !== null && v.analyzed_at !== undefined ? Number(v.analyzed_at) : null,
    })),
    version_family: mapVersionFamily(),
    metadata: metadata.map((m) => ({
      name: m.metadata.name,
      value: String(m.value ?? ''),
      value_type: m.value_type ?? null,
      notes: m.metadata.notes ?? null,
    })),
    document_to_batches: batches.map((b) => ({
      id: String(b.id),
      document_id: String(b.document_id),
      batch_id: String(b.batch_id),
      added_at: b.added_at ?? null,
      batch_started_at: b.batches.started_at ?? null,
      batch_document_count: b.batches._count?.document_to_batches ?? 1,
      batch_origin: b.batch_origin ?? null,
      cost: calculateTotalProcessingCost(b.processing_details, [b]),
      processing_time_seconds: b.processing_time_seconds ?? null,
      ocr_quality_low: b.ocr_quality_low ?? null,
      ocr_quality_medium: b.ocr_quality_medium ?? null,
      batch_legacy_id: b.batches.id_legacy ?? null,
      batch_name: b.batches.name ?? null,
      batch_status: b.batches.lifecycle_status ?? null,
      batch_publication_status: b.batches.publication_status ?? null,
    })),
    document_to_contributors: contributors.map((a) => ({
      id: String(a.id),
      document_id: String(a.document_id),
      contributor_id: String(a.contributor_id),
      contributor_name: a.contributors.name,
      type: a.type ?? null,
      role: a.role,
      notes: a.notes ?? null,
    })),
    document_to_publishers: publishers.map((p) => ({
      id: String(p.id),
      document_id: String(p.document_id),
      publisher_id: String(p.publisher_id),
      publisher_name: p.publishers.name,
      notes: p.notes ?? null,
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
    audits: auditRows.map((audit) => ({
      document_id: documentId,
      field_name: getAuditFieldName(audit.previous_value, audit.new_value, audit.edit_summary),
      source_name: 'Document Details',
      editor_email: audit.editor_email ?? null,
      before_value: formatAuditValue(audit.previous_value),
      after_value: formatAuditValue(audit.new_value),
      changed_at: audit.edited_at?.toISOString() ?? '',
    })),
    state_history: stateHistoryRows.map((state) => ({
      id: String(state.id),
      document_id: String(state.document_id),
      previous_state: state.previous_state ?? null,
      new_state: state.new_state ?? null,
      changed_at: state.changed_at?.toISOString() ?? '',
    })),
  }
}
