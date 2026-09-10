import { normalizeReviewQueueChecklist } from '@constants/reviewQueueChecklist'
import { DOCUMENT_STATES } from '@constants/documentStates'
import { db } from '@lib/db'
import { Prisma } from '@lib/prisma/generated/client'
import type { AccessLevelOption, DocumentTypeOption, StatusOption } from '@lib/search'
import type { SearchQueryDbClient } from '@lib/queries/searchResolvers'
import type { Document } from 'types/documents'
import type { DocumentsCursor, DocumentsPageResult } from 'types/pagination'

export const DOCUMENTS_ORDERABLE_FIELDS = [
  'id',
  'filesize',
  'hash_binary',
  'hash_content',
  'id_legacy',
  'source_id',
  'name',
  'created_at',
  'updated_at',
  'is_duplicate',
] as const

export interface OverviewDocumentRow {
  id: string
  filesize: bigint | number | string | null
  hash_binary: string | null
  hash_content: string | null
  id_legacy: string | null
  source_id: string | null
  name: string | null
  validation_status: string | null
  validation_timestamp?: bigint | number | string | null
  validator_name?: string | null
  validation_comment?: string | null
  validation_comment_additional?: string | null
  review_checklist?: unknown
  created_at: Date | string | null
  updated_at: Date | string | null
  is_duplicate: boolean | number | bigint | string | null
  sort_value: string | number | bigint | Date | null
}

export interface NeedsReviewDocumentRow extends OverviewDocumentRow {
  total_count: bigint | number | string | null
}

export const OVERVIEW_SORT_EXPRESSIONS: Record<(typeof DOCUMENTS_ORDERABLE_FIELDS)[number], string> = {
  id: "COALESCE(d.id, '')",
  filesize: 'COALESCE(d.filesize, -1)',
  hash_binary: "COALESCE(d.hash_binary, '')",
  hash_content: "COALESCE(d.hash_content, '')",
  id_legacy: "COALESCE(d.id_legacy, '')",
  source_id:
    "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(source_meta.value, '$.value')), JSON_UNQUOTE(JSON_EXTRACT(source_meta.value, '$')), source_meta.value, '')",
  name: "COALESCE(d.name, '')",
  created_at: "COALESCE(d.created_at, TIMESTAMP('1000-01-01 00:00:00'))",
  updated_at: "COALESCE(d.updated_at, TIMESTAMP('1000-01-01 00:00:00'))",
  is_duplicate: 'CASE WHEN dup.document_id IS NULL THEN 0 ELSE 1 END',
}

export const DEFAULT_OVERVIEW_SORT_FIELD: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number] = 'name'
export const DEFAULT_OVERVIEW_SECONDARY_SORT_FIELD: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number] = 'updated_at'
const DEFAULT_OVERVIEW_SORT_TIMESTAMP = new Date('1000-01-01T00:00:00.000Z')

export function isOverviewSortField(
  value?: string,
): value is (typeof DOCUMENTS_ORDERABLE_FIELDS)[number] {
  return !!value && (DOCUMENTS_ORDERABLE_FIELDS as readonly string[]).includes(value)
}

export function normalizeOverviewSortField(
  value?: string,
): (typeof DOCUMENTS_ORDERABLE_FIELDS)[number] {
  return isOverviewSortField(value) ? value : DEFAULT_OVERVIEW_SORT_FIELD
}

export type QueryDbClient = SearchQueryDbClient

export async function getOverviewDocumentsPage(
  params: {
    page: number
    pageSize: number
    orderBy?: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
    sortDirection?: 'asc' | 'desc'
    search?: string
    tagIds?: string[]
    statuses?: StatusOption[]
    documentType?: DocumentTypeOption
    batchIds?: string[]
    createdFrom?: string
    createdTo?: string
    collection?: string
    accessLevel?: AccessLevelOption
    documentIds?: string[]
    requireValidationStatus?: boolean
    additionalConditions?: readonly Prisma.Sql[]
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
  const searchTerm = params.search?.trim()
  const sortExpression = Prisma.raw(OVERVIEW_SORT_EXPRESSIONS[sortField])
  const defaultSecondarySortExpression = usesDefaultSort
    ? Prisma.raw(OVERVIEW_SORT_EXPRESSIONS[DEFAULT_OVERVIEW_SECONDARY_SORT_FIELD])
    : undefined
  const whereSql = buildOverviewDocumentsWhereSql({
    accessLevel: params.accessLevel,
    batchIds: params.batchIds,
    collection: params.collection,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    cursor: params.cursor,
    cursorDirection,
    defaultSecondarySortExpression,
    documentType: params.documentType,
    requireValidationStatus: params.requireValidationStatus,
    searchTerm,
    sortDirection,
    sortExpression,
    sortField,
    statuses: params.statuses,
    tagIds: params.tagIds,
    documentIds: params.documentIds,
    additionalConditions: params.additionalConditions,
  })
  const orderBySql = buildOverviewDocumentsOrderBySql({
    cursorDirection,
    defaultSecondarySortExpression,
    sortDirection,
    sortExpression,
  })

  const baseFromSql = Prisma.sql`
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

  const items = await client.$queryRaw<OverviewDocumentRow[]>(Prisma.sql`
      SELECT
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
        d.created_at,
        d.updated_at,
        CASE WHEN dup.document_id IS NULL THEN 0 ELSE 1 END AS is_duplicate,
        ${sortExpression} AS sort_value
      ${baseFromSql}
      ${whereSql}
      ${orderBySql}
      LIMIT ${params.pageSize + 1}
    `)

  const hasMore = items.length > params.pageSize
  const slicedItems = hasMore ? items.slice(0, params.pageSize) : items
  const orderedItems = cursorDirection === 'prev' ? [...slicedItems].reverse() : slicedItems
  const normalizedItems = orderedItems.map(normalizeOverviewDocumentRow)
  const startCursor = buildDocumentsCursor(orderedItems[0], sortField, usesDefaultSort)
  const endCursor = buildDocumentsCursor(orderedItems.at(-1), sortField, usesDefaultSort)

  return {
    data: normalizedItems,
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

export function buildOverviewDocumentsWhereSql(params: {
  additionalConditions?: readonly Prisma.Sql[]
  searchTerm?: string
  tagIds?: string[]
  statuses?: StatusOption[]
  documentType?: DocumentTypeOption
  batchIds?: string[]
  createdFrom?: string
  createdTo?: string
  collection?: string
  accessLevel?: AccessLevelOption
  documentIds?: string[]
  requireValidationStatus?: boolean
  cursor?: DocumentsCursor | null
  cursorDirection: 'next' | 'prev'
  defaultSecondarySortExpression?: Prisma.Sql
  sortDirection: 'asc' | 'desc'
  sortExpression: Prisma.Sql
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
}): Prisma.Sql {
  const conditions: Prisma.Sql[] = [...(params.additionalConditions ?? [])]

  if (params.searchTerm) {
    conditions.push(buildOverviewAuthorSearchConditionSql(params.searchTerm))
  }

  if (params.tagIds) {
    conditions.push(buildOverviewTagConditionSql(params.tagIds))
  }

  if (params.statuses?.length) {
    conditions.push(buildOverviewStatusConditionSql(params.statuses))
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

  if (params.documentIds) {
    conditions.push(
      params.documentIds.length > 0 ? Prisma.sql`d.id IN (${Prisma.join(params.documentIds)})` : Prisma.sql`1 = 0`,
    )
  }

  if (params.requireValidationStatus) {
    conditions.push(Prisma.sql`dq.validation_status IS NOT NULL`)
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

  if (!conditions.length) {
    return Prisma.empty
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
}

export function buildLatestStateConditionSql(alias: string, newState: string): Prisma.Sql {
  const stateAlias = Prisma.raw(alias)
  const newerStateAlias = Prisma.raw(`newer_${alias}`)
  const stateValue =
    newState === DOCUMENT_STATES.INGESTED_FEDORA
      ? Prisma.raw(`'${DOCUMENT_STATES.INGESTED_FEDORA}'`)
      : Prisma.sql`${newState}`

  return Prisma.sql`EXISTS (
    SELECT 1
    FROM state_history ${stateAlias}
    WHERE ${stateAlias}.document_id = d.id
      AND ${stateAlias}.new_state = ${stateValue}
      AND NOT EXISTS (
        SELECT 1
        FROM state_history ${newerStateAlias}
        WHERE ${newerStateAlias}.document_id = ${stateAlias}.document_id
          AND (
            ${newerStateAlias}.changed_at > ${stateAlias}.changed_at
            OR (
              ${newerStateAlias}.changed_at = ${stateAlias}.changed_at
              AND ${newerStateAlias}.id > ${stateAlias}.id
            )
          )
      )
  )`
}

export function buildPreservationCandidateConditionSql(alias: string): Prisma.Sql {
  const documentAlias = Prisma.raw(alias)

  return Prisma.sql`EXISTS (
    SELECT 1
    FROM document_to_metadata candidate_metadata
    INNER JOIN metadata candidate_metadata_definition
      ON candidate_metadata_definition.id = candidate_metadata.metadata_id
    WHERE candidate_metadata.document_id = ${documentAlias}.id
      AND candidate_metadata_definition.name = 'preservation_candidate'
      AND COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(candidate_metadata.value, '$.value')),
        JSON_UNQUOTE(JSON_EXTRACT(candidate_metadata.value, '$')),
        TRIM(CAST(candidate_metadata.value AS CHAR))
      ) = 'true'
  )`
}

export async function getPreservationCandidateDocumentIds(
  documentIds: readonly string[],
  client: QueryDbClient,
): Promise<Set<string>> {
  if (documentIds.length === 0) return new Set()

  const rows = await client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT d.id
    FROM documents d
    WHERE d.id IN (${Prisma.join(documentIds)})
      AND ${buildPreservationCandidateConditionSql('d')}
  `)

  return new Set(rows.map((row) => String(row.id)))
}

export function buildOverviewStatusConditionSql(statuses: StatusOption[]): Prisma.Sql {
  const normalizedStatuses = Array.from(new Set(statuses.map((status) => status.toLowerCase())))
  return Prisma.sql`LOWER(COALESCE(dq.validation_status, '')) IN (${Prisma.join(normalizedStatuses)})`
}

export function buildOverviewAuthorSearchConditionSql(searchTerm: string): Prisma.Sql {
  const rawTokens = searchTerm
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean)

  const tokens = Array.from(new Set(rawTokens))
  if (!tokens.length) {
    return Prisma.sql`1 = 1`
  }

  const normalizedAuthorNameSql = Prisma.sql`
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(LOWER(c.name COLLATE utf8mb4_unicode_ci), ' ', ''),
          ',',
          ''
        ),
        '.',
        ''
      ),
      '-',
      ''
    )
  `

  const tokenConditions = tokens.map((token) => {
    const likeValue = `%${token}%`
    return Prisma.sql`${normalizedAuthorNameSql} LIKE ${likeValue}`
  })

  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM document_to_contributors dtc
      INNER JOIN contributors c ON c.id = dtc.contributor_id
      WHERE dtc.document_id = d.id
        AND dtc.role = 'author'
        AND (${Prisma.join(tokenConditions, ' OR ')})
    )
  `
}

export function buildOverviewBatchConditionSql(batchIds: string[]): Prisma.Sql {
  if (batchIds.length === 0) {
    return Prisma.sql`1 = 0`
  }

  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM document_to_batches dtb
      INNER JOIN batches b ON b.id = dtb.batch_id
      WHERE dtb.document_id = d.id
        AND b.id IN (${Prisma.join(batchIds)})
    )
  `
}

export function buildLibraryBatchConditionSql(batchIds: string[]): Prisma.Sql {
  if (batchIds.length === 0) {
    return Prisma.sql`1 = 0`
  }

  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM document_to_batches filtered_dtb
      INNER JOIN batches filtered_b ON filtered_b.id = filtered_dtb.batch_id
      WHERE filtered_dtb.document_id = d.id
        AND filtered_dtb.id = (
          SELECT latest_dtb.id
          FROM document_to_batches latest_dtb
          INNER JOIN batches latest_b ON latest_b.id = latest_dtb.batch_id
          WHERE latest_dtb.document_id = d.id
          ORDER BY latest_dtb.added_at DESC, latest_b.created_at DESC, latest_dtb.batch_id DESC
          LIMIT 1
        )
        AND filtered_b.id IN (${Prisma.join(batchIds)})
    )
  `
}

export function buildOverviewTagConditionSql(tagIds: string[]): Prisma.Sql {
  if (tagIds.length === 0) {
    return Prisma.sql`1 = 0`
  }

  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM document_to_tags dtt
      WHERE dtt.document_id = d.id
        AND dtt.tag_id IN (${Prisma.join(tagIds)})
    )
  `
}

export function buildOverviewCollectionConditionSql(collection: string): Prisma.Sql {
  const normalizedCollection = collection.toLowerCase()

  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM document_to_tags dtt
      INNER JOIN tags t ON t.id = dtt.tag_id
      WHERE dtt.document_id = d.id
        AND LOWER(t.name) = ${normalizedCollection}
    )
  `
}

export function buildOverviewDocumentsCursorConditionSql(params: {
  cursor: DocumentsCursor
  cursorDirection: 'next' | 'prev'
  defaultSecondarySortExpression?: Prisma.Sql
  sortDirection: 'asc' | 'desc'
  sortExpression: Prisma.Sql
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
}): Prisma.Sql {
  const movesForward = params.cursorDirection === 'next'
  const usesAscendingPrimary =
    (params.sortDirection === 'asc' && movesForward) || (params.sortDirection === 'desc' && !movesForward)
  const primaryComparator = Prisma.raw(usesAscendingPrimary ? '>' : '<')
  const secondaryComparator = Prisma.raw(movesForward ? '>' : '<')
  const cursorValue = coerceDocumentsCursorValue(params.sortField, params.cursor.value)

  if (params.defaultSecondarySortExpression) {
    const compositeCursorValue = coerceDefaultOverviewCursorValue(params.cursor.value)

    return Prisma.sql`
      (
        ${params.sortExpression} ${primaryComparator} ${compositeCursorValue.primary}
        OR (
          ${params.sortExpression} = ${compositeCursorValue.primary}
          AND ${params.defaultSecondarySortExpression} ${primaryComparator} ${compositeCursorValue.secondary}
        )
        OR (
          ${params.sortExpression} = ${compositeCursorValue.primary}
          AND ${params.defaultSecondarySortExpression} = ${compositeCursorValue.secondary}
          AND d.id ${secondaryComparator} ${params.cursor.id}
        )
      )
    `
  }

  return Prisma.sql`
    (
      ${params.sortExpression} ${primaryComparator} ${cursorValue}
      OR (
        ${params.sortExpression} = ${cursorValue}
        AND d.id ${secondaryComparator} ${params.cursor.id}
      )
    )
  `
}

export function buildOverviewDocumentsOrderBySql(params: {
  cursorDirection: 'next' | 'prev'
  defaultSecondarySortExpression?: Prisma.Sql
  sortDirection: 'asc' | 'desc'
  sortExpression: Prisma.Sql
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

  if (params.defaultSecondarySortExpression) {
    return Prisma.sql`
      ORDER BY
        ${params.sortExpression} ${Prisma.raw(primaryDirection)},
        ${params.defaultSecondarySortExpression} ${Prisma.raw(primaryDirection)},
        d.id ${Prisma.raw(secondaryDirection)}
    `
  }

  return Prisma.sql`
    ORDER BY ${params.sortExpression} ${Prisma.raw(primaryDirection)}, d.id ${Prisma.raw(secondaryDirection)}
  `
}

export function buildDocumentsCursor(
  row: OverviewDocumentRow | undefined,
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number],
  usesDefaultSort = false,
): DocumentsCursor | null {
  if (!row) {
    return null
  }
  return {
    id: String(row.id),
    value: usesDefaultSort
      ? serializeDefaultOverviewCursorValue(row)
      : serializeDocumentsCursorValue(sortField, row.sort_value),
  }
}

export function serializeDocumentsCursorValue(
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number],
  value: OverviewDocumentRow['sort_value'],
): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (sortField === 'created_at' || sortField === 'updated_at') {
    const dateValue = value instanceof Date ? value : new Date(String(value))
    return dateValue.toISOString()
  }

  return String(value)
}

export function coerceDocumentsCursorValue(
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number],
  value: string,
): string | number | Date {
  if (sortField === 'filesize' || sortField === 'is_duplicate') {
    return Number(value)
  }

  if (sortField === 'created_at' || sortField === 'updated_at') {
    return new Date(value)
  }

  return value
}

export function serializeDefaultOverviewCursorValue(row: OverviewDocumentRow): string {
  return JSON.stringify({
    primary: String(row.sort_value ?? ''),
    secondary:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at
          ? new Date(String(row.updated_at)).toISOString()
          : '',
  })
}

export function coerceDefaultOverviewCursorValue(value: string): {
  primary: string
  secondary: Date
} {
  try {
    const parsed = JSON.parse(value) as {
      primary?: string
      secondary?: string
    }

    return {
      primary: parsed.primary ?? '',
      secondary: parsed.secondary ? new Date(parsed.secondary) : DEFAULT_OVERVIEW_SORT_TIMESTAMP,
    }
  } catch {
    return {
      primary: value,
      secondary: DEFAULT_OVERVIEW_SORT_TIMESTAMP,
    }
  }
}

export function normalizeOverviewDocumentRow(row: OverviewDocumentRow): Document {
  return {
    id: String(row.id),
    filesize: row.filesize !== null && row.filesize !== undefined ? Number(row.filesize) : null,
    hash_binary: row.hash_binary ?? null,
    hash_content: row.hash_content ?? null,
    id_legacy: row.id_legacy ?? null,
    source_id: row.source_id ?? null,
    name: row.name ?? null,
    validation_status: row.validation_status ?? null,
    validation_timestamp:
      row.validation_timestamp !== null && row.validation_timestamp !== undefined
        ? Number(row.validation_timestamp)
        : null,
    validator_name: row.validator_name ?? null,
    validation_comment: row.validation_comment ?? null,
    validation_comment_additional: row.validation_comment_additional ?? null,
    ...(row.review_checklist !== undefined
      ? { review_checklist: normalizeReviewQueueChecklist(row.review_checklist) }
      : {}),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    is_duplicate: Boolean(Number(row.is_duplicate ?? 0)),
  }
}

export function normalizePageNumber(page?: number): number {
  if (!page || page < 1 || Number.isNaN(page)) {
    return 1
  }
  return Math.floor(page)
}

export function isTruthyMetadataValue(value: string | null): boolean {
  if (!value?.trim()) {
    return false
  }

  const normalized = value.trim()
  const lowered = normalized.toLowerCase()
  if (['false', '0', 'no', 'null', ''].includes(lowered)) {
    return false
  }

  try {
    const parsed: unknown = JSON.parse(normalized)

    if (typeof parsed === 'boolean') {
      return parsed
    }

    if (typeof parsed === 'string') {
      return isTruthyMetadataValue(parsed)
    }

    if (parsed && typeof parsed === 'object' && 'value' in parsed) {
      const objectValue = parsed.value
      if (typeof objectValue === 'boolean') {
        return objectValue
      }

      if (typeof objectValue === 'string') {
        return isTruthyMetadataValue(objectValue)
      }
    }
  } catch {
    // Treat non-JSON truthy values like "yes" as true.
  }

  return true
}
