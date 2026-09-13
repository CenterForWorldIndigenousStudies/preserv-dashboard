import { REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES, REVIEW_QUEUE_SORT_FIELDS } from '@constants/reviewQueue'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { GENERATED_DOCUMENT_STATES } from '@constants/generated/documentStates'
import {
  isReviewQueueChecklistItemKey,
  normalizeReviewQueueChecklist,
  REVIEW_QUEUE_CHECKLIST_ITEMS,
  type ReviewQueueChecklistItemKey,
  type ReviewQueueChecklistState,
} from '@constants/reviewQueueChecklist'
import {
  NEEDS_REVIEW_HISTORY_METADATA_NAME,
  NEEDS_REVIEW_HISTORY_METADATA_NOTES,
  NEEDS_REVIEW_METADATA_NAME,
} from '@constants/documentMetadata'
import { db } from '@lib/db'
import { createEditHistoryEntry, markDocumentBatchesPublicationLocked } from '@lib/editHistory'
import { composeReviewQueueReasons } from '@lib/needsReview'
import { evaluateDocumentReadiness } from '@lib/pipelineReadiness'
import { appendReviewHistoryEpisode } from '@lib/reviewHistory'
import { parseCommentPipelineEvents } from '@lib/commentPipeline'
import { removeOpenDraftMemberships } from '@lib/queries/reprocessingDraftQueries'
import { resolveBatchSearchIds, resolveTagSearchIds } from '@lib/queries/searchResolvers'
import {
  Prisma,
  type document_quality_validation_status as DocumentQualityValidationStatus,
} from '@lib/prisma/generated/client'
import {
  DEFAULT_OVERVIEW_SECONDARY_SORT_FIELD,
  DEFAULT_OVERVIEW_SORT_FIELD,
  DOCUMENTS_ORDERABLE_FIELDS,
  OVERVIEW_SORT_EXPRESSIONS,
  buildLatestStateConditionSql,
  buildOverviewContributorSearchConditionSql,
  buildOverviewPublisherSearchConditionSql,
  buildOverviewBatchConditionSql,
  buildOverviewCollectionConditionSql,
  buildOverviewDocumentsCursorConditionSql,
  buildOverviewStatusConditionSql,
  buildOverviewTagConditionSql,
  buildDocumentsCursor,
  isTruthyMetadataValue,
  buildPreservationCandidateConditionSql,
  coerceDefaultOverviewCursorValue,
  coerceDocumentsCursorValue,
  normalizeOverviewDocumentRow,
  isOverviewSortField,
  normalizeOverviewSortField,
  normalizePageNumber,
  type NeedsReviewDocumentRow,
  type QueryDbClient,
} from '@lib/queries/documentQuerySupport'
import { normalizeDocumentTablePageSize, type DocumentsQueryParams } from '@lib/queries/documentQueries'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeStatuses,
  normalizeTextFilter,
  type AccessLevelOption,
  type DocumentTypeOption,
  type StatusOption,
} from '@lib/search'
import type { Document, ReviewItem } from 'types/documents'
import type { DocumentsCursor, DocumentsPageResult, PagedResult } from 'types/pagination'
import type { ReviewHistoryEpisode } from 'types/reviewHistory'
import type {
  ReviewQueryParams,
  ReviewQueueDocumentsQueryParams,
  ReviewQueueItem,
  ReviewQueueSortField,
} from 'types/reviewQueue'
async function hydrateNeedsReviewReasons(documents: Document[], client: QueryDbClient): Promise<Document[]> {
  if (documents.length === 0) {
    return documents
  }

  const documentIds = documents.map((document) => document.id)
  const [metadataRows, draftRows] = await Promise.all([
    client.document_to_metadata.findMany({
      where: {
        document_id: { in: documentIds },
        metadata: { name: { in: ['needs_review', 'comment_pipeline'] } },
      },
      select: {
        document_id: true,
        value: true,
        value_type: true,
        metadata: { select: { name: true } },
      },
    }),
    client.document_to_batches?.findMany({
      where: {
        document_id: { in: documentIds },
        batches: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT },
      },
      select: { document_id: true, batches: { select: { id: true, name: true } } },
    }),
  ])
  const metadataValueByDocumentId = new Map<string, unknown>()
  const pipelineDiagnosticDocumentIds = new Set<string>()

  for (const metadataRow of metadataRows) {
    if (metadataRow.metadata.name === NEEDS_REVIEW_METADATA_NAME) {
      metadataValueByDocumentId.set(metadataRow.document_id, metadataRow.value)
    }
    if (metadataRow.metadata.name === 'comment_pipeline') {
      const events = parseCommentPipelineEvents(metadataRow.value, metadataRow.value_type)
      if (events.length > 0) {
        pipelineDiagnosticDocumentIds.add(metadataRow.document_id)
      }
    }
  }

  const draftByDocumentId = new Map((draftRows ?? []).map((row) => [row.document_id, row.batches]))

  return documents.map((document) => {
    const reasons = composeReviewQueueReasons(metadataValueByDocumentId.get(document.id), document.validation_status)
    const draft = draftByDocumentId.get(document.id)
    return {
      ...(reasons.length > 0 ? { ...document, needs_review_reasons: reasons } : document),
      open_reprocessing_draft: draft ?? null,
      has_pipeline_diagnostics: pipelineDiagnosticDocumentIds.has(document.id),
    }
  })
}
export async function getNeedsReviewDocuments(
  params: DocumentsQueryParams = {},
  client: QueryDbClient = db,
): Promise<DocumentsPageResult> {
  const page = normalizePageNumber(params.page)
  const pageSize = normalizeDocumentTablePageSize(params.pageSize)
  const statuses = resolveReviewQueueValidationScope(params.statuses)

  const result = await getNeedsReviewDocumentsPage(
    {
      page,
      pageSize,
      orderBy: params.orderBy,
      sortDirection: params.sortDirection,
      contributor: normalizeTextFilter(params.contributor ?? params.search),
      publisher: normalizeTextFilter(params.publisher),
      statuses,
      tagIds: await resolveTagSearchIds(normalizeTextFilter(params.tag), client),
      documentType: normalizeDocumentType(params.documentType),
      batchIds: await resolveBatchSearchIds(normalizeTextFilter(params.batch), client),
      createdFrom: normalizeDateFilter(params.createdFrom),
      createdTo: normalizeDateFilter(params.createdTo),
      collection: normalizeTextFilter(params.collection),
      accessLevel: normalizeAccessLevel(params.accessLevel),
      cursor: params.cursorValue && params.cursorId ? { value: params.cursorValue, id: params.cursorId } : null,
      cursorDirection: params.cursorDirection,
    },
    client,
  )

  return {
    ...result,
    data: await hydrateNeedsReviewReasons(result.data, client),
  }
}

const needsReviewDocumentsBaseFromSql = Prisma.sql`
  FROM documents d
  LEFT JOIN (
    SELECT dtm.document_id, dtm.value
    FROM document_to_metadata dtm
    INNER JOIN metadata m ON m.id = dtm.metadata_id
    WHERE m.name = 'source_id'
  ) AS source_meta ON source_meta.document_id = d.id
  LEFT JOIN (
    SELECT DISTINCT dtt.document_id
    FROM document_to_tags dtt
    INNER JOIN tags t ON t.id = dtt.tag_id
    WHERE t.name = 'duplicate_document'
  ) AS dup ON dup.document_id = d.id
  LEFT JOIN document_quality dq ON dq.document_id = d.id
  LEFT JOIN document_access da ON da.document_id = d.id
  LEFT JOIN access_levels al ON al.id = da.access_level_id
`

export async function getNeedsReviewDocumentsCount(
  params: DocumentsQueryParams = {},
  client: QueryDbClient = db,
): Promise<number> {
  const statuses = resolveReviewQueueValidationScope(params.statuses)
  const whereSql = buildNeedsReviewDocumentsWhereSql({
    accessLevel: normalizeAccessLevel(params.accessLevel),
    batchIds: await resolveBatchSearchIds(normalizeTextFilter(params.batch), client),
    collection: normalizeTextFilter(params.collection),
    createdFrom: normalizeDateFilter(params.createdFrom),
    createdTo: normalizeDateFilter(params.createdTo),
    cursor: null,
    cursorDirection: 'next',
    defaultSecondarySortExpression: undefined,
    documentType: normalizeDocumentType(params.documentType),
    contributorTerm: normalizeTextFilter(params.contributor ?? params.search),
    publisherTerm: normalizeTextFilter(params.publisher),
    sortDirection: 'asc',
    sortExpression: Prisma.raw(OVERVIEW_SORT_EXPRESSIONS[DEFAULT_OVERVIEW_SORT_FIELD]),
    sortField: DEFAULT_OVERVIEW_SORT_FIELD,
    statuses,
    tagIds: await resolveTagSearchIds(normalizeTextFilter(params.tag), client),
  })

  const result = await client.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
    SELECT COUNT(DISTINCT d.id) AS total
    ${needsReviewDocumentsBaseFromSql}
    ${whereSql}
  `)

  const total = result[0]?.total
  return typeof total === 'bigint' ? Number(total) : Number(total ?? 0)
}
export interface ReviewQueueDecisionParams {
  documentId: string
  decision: 'APPROVED' | 'REJECTED'
  validationTimestamp?: number
  validatorName?: string | null
}

export class ReviewQueueApprovalBlockedError extends Error {
  readonly unmetRequirements: string[]

  constructor(unmetRequirements: string[]) {
    super(`Document is not ready for approval: ${unmetRequirements.join(', ')}`)
    this.name = 'ReviewQueueApprovalBlockedError'
    this.unmetRequirements = unmetRequirements
  }
}

export interface ReviewQueueChecklistUpdateParams {
  documentId: string
  itemKey: ReviewQueueChecklistItemKey
  completed: boolean
}

export async function updateReviewQueueChecklist(
  params: ReviewQueueChecklistUpdateParams,
): Promise<ReviewQueueChecklistState> {
  const documentId = params.documentId.trim()
  if (!documentId) {
    throw new Error('Document ID is required.')
  }

  if (!isReviewQueueChecklistItemKey(params.itemKey)) {
    throw new Error('Review checklist item is invalid.')
  }

  return db.$transaction(async (tx) => {
    const qualityRecord = await tx.document_quality.findUnique({
      where: { document_id: documentId },
      select: { id: true, review_checklist: true },
    })

    if (!qualityRecord) {
      throw new Error(`Document ${documentId} does not have a quality record.`)
    }

    const previousChecklist = normalizeReviewQueueChecklist(qualityRecord.review_checklist)
    const nextChecklist: ReviewQueueChecklistState = {
      ...previousChecklist,
      [params.itemKey]: params.completed,
    }

    if (previousChecklist[params.itemKey] === params.completed) {
      return previousChecklist
    }

    await tx.document_quality.update({
      where: { document_id: documentId },
      data: { review_checklist: JSON.stringify(nextChecklist) },
    })

    const checklistLabel =
      REVIEW_QUEUE_CHECKLIST_ITEMS.find((item) => item.key === params.itemKey)?.label ?? params.itemKey
    await createEditHistoryEntry(tx, {
      entityTable: 'document_quality',
      entityId: qualityRecord.id,
      previousValue: { review_checklist: previousChecklist },
      newValue: { review_checklist: nextChecklist },
      editSummary: `Updated review checklist item "${checklistLabel}" for document "${documentId}"`,
    })
    await markDocumentBatchesPublicationLocked(tx, documentId)

    return nextChecklist
  })
}

interface NormalizedReviewQueueDecisionParams {
  documentId: string
  decision: 'APPROVED' | 'REJECTED'
  validationTimestamp: number
  validatorName: string
}

export async function applyReviewQueueDecisionInTransaction(
  tx: Prisma.TransactionClient,
  params: NormalizedReviewQueueDecisionParams,
): Promise<void> {
  const { documentId, decision, validationTimestamp, validatorName } = params
  const newState =
    params.decision === 'APPROVED' ? GENERATED_DOCUMENT_STATES.APPROVED : GENERATED_DOCUMENT_STATES.REJECTED
  const nextValidationStatus: DocumentQualityValidationStatus = params.decision

  const qualityRecord = await tx.document_quality.findUnique({
    where: { document_id: documentId },
    select: { id: true, document_id: true, validation_status: true, review_checklist: true },
  })

  if (!qualityRecord) {
    throw new Error(`Document ${documentId} does not have a quality record.`)
  }

  if (decision === 'APPROVED') {
    const readiness = await evaluateDocumentReadiness(documentId, tx)
    if (!readiness.isPreservationCandidate) {
      throw new ReviewQueueApprovalBlockedError(['preservation_candidate'])
    }
    if (!readiness.evaluation.approved) {
      throw new ReviewQueueApprovalBlockedError(readiness.evaluation.unmetRequirements)
    }
  }

  await removeOpenDraftMemberships(tx, [documentId])

  const [activeReviewMetadata, reviewHistoryMetadata, latestState] = await Promise.all([
    tx.document_to_metadata.findFirst({
      where: {
        document_id: documentId,
        metadata: { name: NEEDS_REVIEW_METADATA_NAME },
      },
      select: { id: true, value: true },
    }),
    tx.document_to_metadata.findFirst({
      where: {
        document_id: documentId,
        metadata: { name: NEEDS_REVIEW_HISTORY_METADATA_NAME },
      },
      select: { id: true, metadata_id: true, value: true },
    }),
    tx.state_history.findFirst({
      where: { document_id: documentId },
      select: { new_state: true },
      orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
    }),
  ])

  const reasons = composeReviewQueueReasons(activeReviewMetadata?.value, qualityRecord.validation_status)
  const episode: ReviewHistoryEpisode = {
    episode_id: crypto.randomUUID(),
    resolved_at: new Date().toISOString(),
    resolved_by: validatorName || null,
    decision,
    validation_status_before: qualityRecord.validation_status ?? null,
    reasons,
    source: 'dashboard_decision',
    inferred: false,
  }

  let historyMetadataId = reviewHistoryMetadata?.metadata_id
  if (!historyMetadataId) {
    const existingHistoryDefinition = await tx.metadata.findFirst({
      where: { name: NEEDS_REVIEW_HISTORY_METADATA_NAME },
      select: { id: true },
    })
    historyMetadataId = existingHistoryDefinition?.id

    if (!historyMetadataId) {
      const createdHistoryDefinition = await tx.metadata.create({
        data: {
          id: crypto.randomUUID(),
          name: NEEDS_REVIEW_HISTORY_METADATA_NAME,
          notes: NEEDS_REVIEW_HISTORY_METADATA_NOTES,
        },
        select: { id: true },
      })
      historyMetadataId = createdHistoryDefinition.id
    }
  }

  const historyValue = appendReviewHistoryEpisode(reviewHistoryMetadata?.value, episode)
  await tx.document_to_metadata.upsert({
    where: {
      document_id_metadata_id: {
        document_id: documentId,
        metadata_id: historyMetadataId,
      },
    },
    create: {
      id: crypto.randomUUID(),
      document_id: documentId,
      metadata_id: historyMetadataId,
      value: JSON.stringify(historyValue),
      value_type: 'json',
    },
    update: {
      value: JSON.stringify(historyValue),
      value_type: 'json',
    },
  })

  if (activeReviewMetadata) {
    await tx.document_to_metadata.delete({ where: { id: activeReviewMetadata.id } })
  }

  if (qualityRecord.review_checklist !== null && qualityRecord.review_checklist !== undefined) {
    await createEditHistoryEntry(tx, {
      entityTable: 'document_quality',
      entityId: qualityRecord.id,
      previousValue: { review_checklist: normalizeReviewQueueChecklist(qualityRecord.review_checklist) },
      newValue: { review_checklist: null },
      editSummary: `Cleared review checklist for document "${documentId}" after ${decision.toLowerCase()}`,
    })
  }

  await tx.state_history.create({
    data: {
      id: crypto.randomUUID(),
      document_id: documentId,
      previous_state: latestState?.new_state ?? null,
      new_state: newState,
      changed_at: new Date(),
    },
  })

  await tx.document_quality.update({
    where: { document_id: documentId },
    data: {
      validation_status: nextValidationStatus,
      validation_timestamp: validationTimestamp,
      validator_name: validatorName || undefined,
      review_checklist: null,
    },
  })
  await markDocumentBatchesPublicationLocked(tx, documentId)
}

export async function applyReviewQueueDecision(params: ReviewQueueDecisionParams): Promise<void> {
  const documentId = params.documentId.trim()
  if (!documentId) {
    throw new Error('Document ID is required.')
  }

  const validationTimestamp = Number.isFinite(params.validationTimestamp)
    ? Math.floor(params.validationTimestamp ?? 0)
    : Math.floor(Date.now() / 1000)
  const validatorName = params.validatorName?.trim() ?? ''

  await db.$transaction((tx) =>
    applyReviewQueueDecisionInTransaction(tx, {
      documentId,
      decision: params.decision,
      validationTimestamp,
      validatorName,
    }),
  )
}
const REVIEW_QUEUE_DEFAULT_PAGE_SIZE = 25
const REVIEW_QUEUE_MAX_PAGE_SIZE = 100
const REVIEW_QUEUE_STATUS_REASONS: Record<string, string> = {
  IN_PROGRESS: 'Validation in progress',
  NEEDS_REVISION: 'Needs revision',
}
const REVIEW_QUEUE_METADATA_REASONS = {
  needs_review: 'Needs review metadata',
  sensitive: 'Sensitive metadata',
} as const
function normalizeReviewQueuePageSize(pageSize?: number): number {
  if (!pageSize || pageSize < 1 || Number.isNaN(pageSize)) {
    return REVIEW_QUEUE_DEFAULT_PAGE_SIZE
  }

  return Math.min(Math.floor(pageSize), REVIEW_QUEUE_MAX_PAGE_SIZE)
}

function normalizeReviewQueueSortBy(sortBy?: ReviewQueueSortField): ReviewQueueSortField {
  if (!sortBy) {
    return 'name'
  }

  return REVIEW_QUEUE_SORT_FIELDS.includes(sortBy) ? sortBy : 'name'
}

function normalizeReviewQueueSortDirection(direction?: 'asc' | 'desc'): 'asc' | 'desc' {
  return direction === 'desc' ? 'desc' : 'asc'
}

function normalizeReviewQueueTextFilter(value?: string): string {
  return value?.trim().toLowerCase() ?? ''
}

function getReviewQueueReasons(params: {
  validationStatus: string | null
  needsReview: boolean
  sensitive: boolean
}): string[] {
  const reasons: string[] = []
  const normalizedStatus = params.validationStatus?.trim().toUpperCase() ?? ''

  if (normalizedStatus in REVIEW_QUEUE_STATUS_REASONS) {
    reasons.push(REVIEW_QUEUE_STATUS_REASONS[normalizedStatus])
  }

  if (params.needsReview) {
    reasons.push(REVIEW_QUEUE_METADATA_REASONS.needs_review)
  }

  if (params.sensitive) {
    reasons.push(REVIEW_QUEUE_METADATA_REASONS.sensitive)
  }

  return reasons
}

function matchesReviewQueueSearch(item: ReviewQueueItem, search: string): boolean {
  if (!search) {
    return true
  }

  const haystack = [
    item.id,
    item.name ?? '',
    item.validation_status ?? '',
    item.validator_name ?? '',
    item.validator_email ?? '',
    ...item.queue_reasons,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}

function matchesReviewQueueValidationStatus(item: ReviewQueueItem, validationStatus: string): boolean {
  if (!validationStatus) {
    return true
  }

  return (item.validation_status ?? '').toLowerCase().includes(validationStatus)
}

function compareNullableStrings(left: string | null, right: string | null, direction: 'asc' | 'desc'): number {
  const leftMissing = !left?.trim()
  const rightMissing = !right?.trim()

  if (leftMissing && rightMissing) {
    return 0
  }

  if (leftMissing) {
    return 1
  }

  if (rightMissing) {
    return -1
  }

  const leftValue = left ?? ''
  const rightValue = right ?? ''
  const comparison = leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' })
  return direction === 'desc' ? -comparison : comparison
}

function compareBooleans(left: boolean, right: boolean, direction: 'asc' | 'desc'): number {
  const comparison = Number(left) - Number(right)
  return direction === 'desc' ? -comparison : comparison
}

function compareReviewQueueItems(
  left: ReviewQueueItem,
  right: ReviewQueueItem,
  sortBy: ReviewQueueSortField,
  direction: 'asc' | 'desc',
): number {
  let comparison: number

  switch (sortBy) {
    case 'id':
      comparison = compareNullableStrings(left.id, right.id, direction)
      break
    case 'name':
      comparison = compareNullableStrings(left.name, right.name, direction)
      break
    case 'validation_status':
      comparison = compareNullableStrings(left.validation_status, right.validation_status, direction)
      break
    case 'validator_name':
      comparison = compareNullableStrings(left.validator_name, right.validator_name, direction)
      break
    case 'validator_email':
      comparison = compareNullableStrings(left.validator_email, right.validator_email, direction)
      break
    case 'needs_review':
      comparison = compareBooleans(left.needs_review, right.needs_review, direction)
      break
    case 'sensitive':
      comparison = compareBooleans(left.sensitive, right.sensitive, direction)
      break
    default:
      comparison = 0
      break
  }

  if (comparison !== 0) {
    return comparison
  }

  return compareNullableStrings(left.id, right.id, 'asc')
}
async function getNeedsReviewDocumentsPage(
  params: {
    page: number
    pageSize: number
    orderBy?: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
    sortDirection?: 'asc' | 'desc'
    contributor?: string
    publisher?: string
    statuses?: StatusOption[]
    tagIds?: string[]
    documentType?: DocumentTypeOption
    batchIds?: string[]
    createdFrom?: string
    createdTo?: string
    collection?: string
    accessLevel?: AccessLevelOption
    cursor?: DocumentsCursor | null
    cursorDirection?: 'next' | 'prev'
  },
  client: QueryDbClient = db,
): Promise<DocumentsPageResult> {
  const hasExplicitSort = isOverviewSortField(params.orderBy)
  const usesDefaultSort = !hasExplicitSort
  const sortField = normalizeOverviewSortField(params.orderBy)
  const sortDirection = usesDefaultSort ? 'asc' : params.sortDirection === 'asc' ? 'asc' : 'desc'
  const cursorDirection = params.cursorDirection === 'prev' ? 'prev' : 'next'
  const contributorTerm = params.contributor?.trim()
  const publisherTerm = params.publisher?.trim()
  const sortExpression = Prisma.raw(OVERVIEW_SORT_EXPRESSIONS[sortField])
  const defaultSecondarySortExpression = usesDefaultSort
    ? Prisma.raw(OVERVIEW_SORT_EXPRESSIONS[DEFAULT_OVERVIEW_SECONDARY_SORT_FIELD])
    : undefined
  const whereSql = buildNeedsReviewDocumentsWhereSql({
    accessLevel: params.accessLevel,
    batchIds: params.batchIds,
    collection: params.collection,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    cursor: null,
    cursorDirection,
    defaultSecondarySortExpression,
    documentType: params.documentType,
    contributorTerm,
    publisherTerm,
    sortDirection,
    sortExpression,
    sortField,
    statuses: params.statuses,
    tagIds: params.tagIds,
  })
  const secondarySortSelect = defaultSecondarySortExpression
    ? Prisma.sql`, ${defaultSecondarySortExpression} AS secondary_sort_value`
    : Prisma.empty
  const orderBySql = buildFilteredReviewQueueOrderBySql({
    cursorDirection,
    usesDefaultSort,
    sortDirection,
  })
  const cursorWhereSql = params.cursor
    ? Prisma.sql`WHERE ${buildFilteredReviewQueueCursorConditionSql({
        cursor: params.cursor,
        cursorDirection,
        sortDirection,
        sortField,
        usesDefaultSort,
      })}`
    : Prisma.empty

  const items = await client.$queryRaw<NeedsReviewDocumentRow[]>(Prisma.sql`
    WITH filtered_documents AS (
      SELECT DISTINCT
        d.id,
        d.filesize,
        d.hash_binary,
        d.hash_content,
        d.id_legacy,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(source_meta.value, '$.value')),
          JSON_UNQUOTE(JSON_EXTRACT(source_meta.value, '$')),
          source_meta.value
        ) AS source_id,
        d.name,
        dq.validation_status,
        dq.validation_timestamp,
        dq.validator_name,
        dq.comment AS validation_comment,
        dq.comment_additional AS validation_comment_additional,
        dq.review_checklist,
        d.created_at,
        d.updated_at,
        CASE WHEN dup.document_id IS NULL THEN 0 ELSE 1 END AS is_duplicate,
        ${sortExpression} AS sort_value
        ${secondarySortSelect}
      ${needsReviewDocumentsBaseFromSql}
      ${whereSql}
    ),
    counted_documents AS (
      SELECT
        filtered_documents.*,
        COUNT(*) OVER() AS total_count
      FROM filtered_documents
    )
    SELECT
      counted_documents.*
    FROM counted_documents
    ${cursorWhereSql}
    ${orderBySql}
    LIMIT ${params.pageSize + 1}
  `)

  const hasMore = items.length > params.pageSize
  const slicedItems = hasMore ? items.slice(0, params.pageSize) : items
  const orderedItems = cursorDirection === 'prev' ? [...slicedItems].reverse() : slicedItems
  const normalizedItems = orderedItems.map(normalizeOverviewDocumentRow)
  const startCursor = buildDocumentsCursor(orderedItems[0], sortField, usesDefaultSort)
  const endCursor = buildDocumentsCursor(orderedItems.at(-1), sortField, usesDefaultSort)
  const totalCountValue = items[0]?.total_count
  const totalCount = typeof totalCountValue === 'bigint' ? Number(totalCountValue) : Number(totalCountValue ?? 0)

  return {
    data: normalizedItems,
    totalCount,
    pageInfo: {
      page: params.page,
      pageSize: params.pageSize,
      hasNextPage: cursorDirection === 'prev' ? Boolean(params.cursor) : hasMore,
      hasPreviousPage: params.page > 1,
      startCursor,
      endCursor,
    },
  }
}

function buildFilteredReviewQueueOrderBySql(params: {
  cursorDirection: 'next' | 'prev'
  usesDefaultSort: boolean
  sortDirection: 'asc' | 'desc'
}): Prisma.Sql {
  const primaryDirection =
    params.cursorDirection === 'prev'
      ? params.sortDirection === 'asc'
        ? 'DESC'
        : 'ASC'
      : params.sortDirection === 'asc'
        ? 'ASC'
        : 'DESC'
  const secondaryDirection = params.cursorDirection === 'prev' ? 'DESC' : 'ASC'

  if (params.usesDefaultSort) {
    return Prisma.sql`
      ORDER BY
        counted_documents.sort_value ${Prisma.raw(primaryDirection)},
        counted_documents.secondary_sort_value ${Prisma.raw(primaryDirection)},
        counted_documents.id ${Prisma.raw(secondaryDirection)}
    `
  }

  return Prisma.sql`
    ORDER BY counted_documents.sort_value ${Prisma.raw(primaryDirection)},
      counted_documents.id ${Prisma.raw(secondaryDirection)}
  `
}

function buildFilteredReviewQueueCursorConditionSql(params: {
  cursor: DocumentsCursor
  cursorDirection: 'next' | 'prev'
  sortDirection: 'asc' | 'desc'
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
  usesDefaultSort: boolean
}): Prisma.Sql {
  const movesForward = params.cursorDirection === 'next'
  const usesAscendingPrimary =
    (params.sortDirection === 'asc' && movesForward) || (params.sortDirection === 'desc' && !movesForward)
  const primaryComparator = Prisma.raw(usesAscendingPrimary ? '>' : '<')
  const secondaryComparator = Prisma.raw(movesForward ? '>' : '<')

  if (params.usesDefaultSort) {
    const compositeCursorValue = coerceDefaultOverviewCursorValue(params.cursor.value)

    return Prisma.sql`
      (
        counted_documents.sort_value ${primaryComparator} ${compositeCursorValue.primary}
        OR (
          counted_documents.sort_value = ${compositeCursorValue.primary}
          AND counted_documents.secondary_sort_value ${primaryComparator} ${compositeCursorValue.secondary}
        )
        OR (
          counted_documents.sort_value = ${compositeCursorValue.primary}
          AND counted_documents.secondary_sort_value = ${compositeCursorValue.secondary}
          AND counted_documents.id ${secondaryComparator} ${params.cursor.id}
        )
      )
    `
  }

  const cursorValue = coerceDocumentsCursorValue(params.sortField, params.cursor.value)

  return Prisma.sql`
    (
      counted_documents.sort_value ${primaryComparator} ${cursorValue}
      OR (
        counted_documents.sort_value = ${cursorValue}
        AND counted_documents.id ${secondaryComparator} ${params.cursor.id}
      )
    )
  `
}
function buildNeedsReviewDocumentsWhereSql(params: {
  contributorTerm?: string
  publisherTerm?: string
  statuses?: StatusOption[]
  tagIds?: string[]
  documentType?: DocumentTypeOption
  batchIds?: string[]
  createdFrom?: string
  createdTo?: string
  collection?: string
  accessLevel?: AccessLevelOption
  cursor?: DocumentsCursor | null
  cursorDirection: 'next' | 'prev'
  defaultSecondarySortExpression?: Prisma.Sql
  sortDirection: 'asc' | 'desc'
  sortExpression: Prisma.Sql
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
}): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    buildPreservationCandidateConditionSql('d'),
    buildActiveNeedsReviewConditionSql(),
    Prisma.sql`LOWER(COALESCE(dq.validation_status, '')) NOT IN ('approved', 'rejected')`,
    Prisma.sql`NOT ${buildLatestStateConditionSql('latest_review_state', GENERATED_DOCUMENT_STATES.INGESTED_FEDORA)}`,
  ]

  if (params.statuses?.length) {
    conditions.push(buildOverviewStatusConditionSql(params.statuses))
  }

  if (params.contributorTerm) {
    conditions.push(buildOverviewContributorSearchConditionSql(params.contributorTerm))
  }

  if (params.publisherTerm) {
    conditions.push(buildOverviewPublisherSearchConditionSql(params.publisherTerm))
  }

  if (params.tagIds) {
    conditions.push(buildOverviewTagConditionSql(params.tagIds))
  }

  if (params.documentType === 'unique') {
    conditions.push(Prisma.sql`dup.document_id IS NULL`)
  }

  if (params.documentType === 'duplicate') {
    conditions.push(Prisma.sql`dup.document_id IS NOT NULL`)
  }

  if (params.batchIds) {
    conditions.push(buildOverviewBatchConditionSql(params.batchIds))
  }

  if (params.createdFrom) {
    conditions.push(Prisma.sql`d.created_at >= ${new Date(`${params.createdFrom}T00:00:00.000Z`)}`)
  }

  if (params.createdTo) {
    conditions.push(
      Prisma.sql`d.created_at < DATE_ADD(${new Date(`${params.createdTo}T00:00:00.000Z`)}, INTERVAL 1 DAY)`,
    )
  }

  if (params.collection) {
    conditions.push(buildOverviewCollectionConditionSql(params.collection))
  }

  if (params.accessLevel) {
    conditions.push(Prisma.sql`LOWER(al.level_name) = ${params.accessLevel}`)
  }

  if (params.cursor) {
    conditions.push(
      buildOverviewDocumentsCursorConditionSql({
        cursor: params.cursor,
        cursorDirection: params.cursorDirection,
        defaultSecondarySortExpression: params.defaultSecondarySortExpression,
        sortDirection: params.sortDirection,
        sortExpression: params.sortExpression,
        sortField: params.sortField,
      }),
    )
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
}

function resolveReviewQueueValidationScope(statuses: StatusOption[] | undefined): StatusOption[] | undefined {
  const allowedStatuses = new Set<string>(REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES)
  const filteredStatuses = normalizeStatuses(statuses)?.filter((status) => allowedStatuses.has(status)) ?? []

  return filteredStatuses.length > 0 ? filteredStatuses : undefined
}

function buildActiveNeedsReviewConditionSql(): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM document_to_metadata review_metadata
    INNER JOIN metadata review_metadata_definition
      ON review_metadata_definition.id = review_metadata.metadata_id
    WHERE review_metadata.document_id = d.id
      AND review_metadata_definition.name = 'needs_review'
      AND review_metadata.value IS NOT NULL
      AND TRIM(CAST(review_metadata.value AS CHAR)) <> ''
  )`
}
// getReviewQueue
// Returns an empty result.  The document_reviews table does not exist.
// ---------------------------------------------------------------------------
export async function getReviewQueue(_params: ReviewQueryParams = {}): Promise<PagedResult<ReviewItem>> {
  // document_reviews table does not exist
  return await Promise.resolve({ items: [], total: 0 })
}

// ---------------------------------------------------------------------------
// getDistinctReviewFields
// Returns an empty array.  The document_reviews table does not exist.
// ---------------------------------------------------------------------------
export async function getDistinctReviewFields(): Promise<string[]> {
  // document_reviews table does not exist
  return await Promise.resolve([])
}

// getReviewQueueDocuments
// Returns documents with validation_status IN ('IN_PROGRESS', 'NEEDS_REVISION')
// OR documents that have a 'needs_review' metadata flag OR 'sensitive' metadata TRUE.
// ---------------------------------------------------------------------------
// eslint-disable-next-line complexity -- review queue aggregation combines multiple legacy signals in one query helper.
export async function getReviewQueueDocuments(
  params: ReviewQueueDocumentsQueryParams = {},
  client: QueryDbClient = db,
): Promise<PagedResult<ReviewQueueItem>> {
  const page = normalizePageNumber(params.page)
  const pageSize = normalizeReviewQueuePageSize(params.pageSize)
  const search = normalizeReviewQueueTextFilter(params.search)
  const validationStatus = normalizeReviewQueueTextFilter(params.validationStatus)
  const sortBy = normalizeReviewQueueSortBy(params.sortBy)
  const sortDirection = normalizeReviewQueueSortDirection(params.sortDirection)

  const [needsReviewMeta, sensitiveMeta, qualityDocs] = await Promise.all([
    client.metadata.findFirst({ where: { name: 'needs_review' }, select: { id: true } }),
    client.metadata.findFirst({ where: { name: 'sensitive' }, select: { id: true } }),
    client.$queryRaw<Array<{ document_id: string }>>(Prisma.sql`
      SELECT document_id
      FROM document_quality
      WHERE validation_status IN ('IN_PROGRESS', 'NEEDS_REVISION')
    `),
  ])

  const needsReviewMetaId = needsReviewMeta?.id ?? null
  const sensitiveMetaId = sensitiveMeta?.id ?? null
  const qualityDocIds = new Set(qualityDocs.map((document) => document.document_id))
  const metadataIds = [needsReviewMetaId, sensitiveMetaId].filter((value): value is string => Boolean(value))

  const metadataRows =
    metadataIds.length > 0
      ? await client.document_to_metadata.findMany({
          where: {
            metadata_id: { in: metadataIds },
          },
          select: { document_id: true, metadata_id: true, value: true },
        })
      : []

  const needsReviewDocIds = new Set<string>()
  const sensitiveDocIds = new Set<string>()

  for (const metadataRow of metadataRows) {
    if (!isTruthyMetadataValue(metadataRow.value)) {
      continue
    }

    if (metadataRow.metadata_id === needsReviewMetaId) {
      needsReviewDocIds.add(metadataRow.document_id)
    }

    if (metadataRow.metadata_id === sensitiveMetaId) {
      sensitiveDocIds.add(metadataRow.document_id)
    }
  }

  const allDocIds = new Set([...qualityDocIds, ...needsReviewDocIds, ...sensitiveDocIds])

  if (allDocIds.size === 0) {
    return { items: [], total: 0 }
  }

  const documents = await client.documents.findMany({
    where: { id: { in: [...allDocIds] } },
    include: {
      document_quality: true,
    },
  })

  const items: ReviewQueueItem[] = []

  for (const document of documents) {
    const needsReview = needsReviewDocIds.has(document.id)
    const sensitive = sensitiveDocIds.has(document.id)
    const validationStatusValue = document.document_quality?.validation_status ?? null
    const queueReasons = getReviewQueueReasons({
      validationStatus: validationStatusValue,
      needsReview,
      sensitive,
    })

    if (queueReasons.length === 0) {
      continue
    }

    items.push({
      id: String(document.id),
      name: document.name ?? null,
      validation_status: validationStatusValue,
      validator_name: document.document_quality?.validator_name ?? null,
      validator_email: document.document_quality?.validator_email ?? null,
      needs_review: needsReview,
      sensitive,
      queue_reasons: queueReasons,
    })
  }

  const filteredItems = items
    .filter((item) => matchesReviewQueueSearch(item, search))
    .filter((item) => matchesReviewQueueValidationStatus(item, validationStatus))
    .filter((item) => (params.needsReview === undefined ? true : item.needs_review === params.needsReview))
    .filter((item) => (params.sensitive === undefined ? true : item.sensitive === params.sensitive))
    .sort((left, right) => compareReviewQueueItems(left, right, sortBy, sortDirection))

  const total = filteredItems.length
  const offset = (page - 1) * pageSize

  return {
    items: filteredItems.slice(offset, offset + pageSize),
    total,
  }
}

// ---------------------------------------------------------------------------
