import type { DocumentTableQuery } from '@organisms/DocumentTable/types'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeStatuses,
  normalizeTextFilter,
  parseStatusesParam,
  type AccessLevelOption,
  type AdvancedSearchFilters,
  type DocumentTypeOption,
  type StatusOption,
} from '@lib/search'
import { DOCUMENT_STATES } from '@constants/documentStates'
import { db } from '@lib/db'
import { Prisma } from '@lib/prisma/generated/client'
import { parseMetadataValue } from '@lib/metadata'
import {
  buildDocumentsCursor,
  buildPreservationCandidateConditionSql,
  buildLibraryBatchConditionSql,
  DEFAULT_OVERVIEW_SECONDARY_SORT_FIELD,
  DOCUMENTS_ORDERABLE_FIELDS,
  OVERVIEW_SORT_EXPRESSIONS,
  buildOverviewDocumentsOrderBySql,
  buildOverviewDocumentsWhereSql,
  isOverviewSortField,
  normalizeOverviewSortField,
  normalizePageNumber,
  type OverviewDocumentRow,
  type QueryDbClient,
} from '@lib/queries/documentQuerySupport'
import { normalizeDocumentTablePageSize, type DocumentsQueryParams } from '@lib/queries/documentQueries'
import { resolveBatchSearchIds, resolveTagSearchIds } from '@lib/queries/searchResolvers'
import type { DocumentsCursor } from 'types/pagination'
import type {
  LibraryBatch,
  LibraryCollection,
  LibraryDocumentItem,
  LibraryDocumentsPageResult,
} from 'types/documents'

export interface LibraryBatchAssociation {
  batchId: string
  batchName: string | null
  addedAt: Date | string | number | bigint | null
  batchCreatedAt: Date | string | number | bigint | null
}

interface LibraryDocumentBoundaryRow {
  id: string
  legacyId: string | null
  sourceId: string | null
  name: string | null
  fedoraUrl: string | null
  uploadedAt: Date | string | number | bigint | null
  collections: LibraryCollection[]
  batch: (Omit<LibraryBatch, 'createdAt'> & { createdAt: Date | string | number | bigint | null }) | null
}

interface LibraryDocumentRow extends OverviewDocumentRow {
  fedora_url: unknown
  fedora_url_type: unknown
  uploaded_at: Date | string | number | bigint | null
}

function compareLibraryTimestamp(
  left: Date | string | number | bigint | null,
  right: Date | string | number | bigint | null,
): number {
  if (left === null || left === undefined) return -1
  if (right === null || right === undefined) return 1

  const leftDateValue = typeof left === 'bigint' ? Number(left) : left
  const rightDateValue = typeof right === 'bigint' ? Number(right) : right
  return new Date(leftDateValue).getTime() - new Date(rightDateValue).getTime()
}

export function selectLatestLibraryBatch(
  associations: readonly LibraryBatchAssociation[],
): LibraryBatchAssociation | null {
  return associations.reduce<LibraryBatchAssociation | null>((latest, candidate) => {
    if (!latest) return candidate

    const addedAtComparison = compareLibraryTimestamp(candidate.addedAt, latest.addedAt)
    if (addedAtComparison !== 0) return addedAtComparison > 0 ? candidate : latest

    const createdAtComparison = compareLibraryTimestamp(candidate.batchCreatedAt, latest.batchCreatedAt)
    if (createdAtComparison !== 0) return createdAtComparison > 0 ? candidate : latest

    return candidate.batchId.localeCompare(latest.batchId) > 0 ? candidate : latest
  }, null)
}

function normalizeLibraryDateTime(value: Date | string | number | bigint | null): string | null {
  if (value === null || value === undefined) return null

  const dateValue = typeof value === 'bigint' ? Number(value) : value
  const date = new Date(dateValue)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function normalizeRawLibraryMetadataValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value.toString()
  return null
}

export function normalizeLibraryDocument(row: LibraryDocumentBoundaryRow): LibraryDocumentItem {
  return {
    id: String(row.id),
    legacyId: row.legacyId ?? null,
    sourceId: row.sourceId ?? null,
    name: row.name ?? null,
    fedoraUrl: row.fedoraUrl ?? null,
    uploadedAt: normalizeLibraryDateTime(row.uploadedAt),
    collections: row.collections.map((collection) => ({
      id: String(collection.id),
      name: String(collection.name),
    })),
    batch: row.batch
      ? {
          id: String(row.batch.id),
          name: row.batch.name ?? null,
          createdAt: normalizeLibraryDateTime(row.batch.createdAt),
        }
      : null,
  }
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseLibraryQueryParams(
  params: Record<string, string | string[] | undefined>,
): DocumentTableQuery<AdvancedSearchFilters> {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const sortDirection = firstSearchParam(params.sortDirection)
  const cursorDirection = firstSearchParam(params.cursorDirection)

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    search: normalizeTextFilter(firstSearchParam(params.search)),
    orderBy: firstSearchParam(params.orderBy),
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    cursorValue: normalizeTextFilter(firstSearchParam(params.cursorValue)),
    cursorId: normalizeTextFilter(firstSearchParam(params.cursorId)),
    cursorDirection: cursorDirection === 'prev' || cursorDirection === 'next' ? cursorDirection : undefined,
    filters: {
      author: normalizeTextFilter(firstSearchParam(params.author)),
      tag: normalizeTextFilter(firstSearchParam(params.tag)),
      statuses: parseStatusesParam(params.statuses),
      documentType: normalizeDocumentType(firstSearchParam(params.documentType)),
      batch: normalizeTextFilter(firstSearchParam(params.batch)),
      createdFrom: normalizeDateFilter(firstSearchParam(params.createdFrom)),
      createdTo: normalizeDateFilter(firstSearchParam(params.createdTo)),
      collection: normalizeTextFilter(firstSearchParam(params.collection)),
      accessLevel: normalizeAccessLevel(firstSearchParam(params.accessLevel)),
    },
  }
}

const libraryDocumentsBaseFromSql = Prisma.sql`
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
  INNER JOIN document_quality dq ON dq.document_id = d.id
  INNER JOIN state_history latest_state ON latest_state.id = dq.current_status
  LEFT JOIN (
    SELECT dtm.document_id, dtm.value, dtm.value_type
    FROM document_to_metadata dtm
    INNER JOIN metadata m ON m.id = dtm.metadata_id
    WHERE m.name = 'fedora_url'
  ) AS fedora_meta ON fedora_meta.document_id = d.id
  LEFT JOIN (
    SELECT da.document_id, MIN(al.level_name) AS level_name
    FROM document_access da
    INNER JOIN access_levels al ON al.id = da.access_level_id
    GROUP BY da.document_id
  ) AS al ON al.document_id = d.id
`

interface LibraryQueryContext {
  page: number
  pageSize: number
  usesDefaultSort: boolean
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
  sortDirection: 'asc' | 'desc'
  cursorDirection: 'next' | 'prev'
  cursor: DocumentsCursor | null
  filterParams: {
    accessLevel?: AccessLevelOption
    batchIds?: string[]
    collection?: string
    createdFrom?: string
    createdTo?: string
    defaultSecondarySortExpression?: Prisma.Sql
    documentType?: DocumentTypeOption
    searchTerm?: string
    sortDirection: 'asc' | 'desc'
    sortExpression: Prisma.Sql
    sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
    statuses?: StatusOption[]
    tagIds?: string[]
  }
}

async function buildLibraryQueryContext(
  params: DocumentsQueryParams,
  client: QueryDbClient,
): Promise<LibraryQueryContext> {
  const page = normalizePageNumber(params.page)
  const pageSize = normalizeDocumentTablePageSize(params.pageSize)
  const hasExplicitSort = isOverviewSortField(params.orderBy)
  const usesDefaultSort = !hasExplicitSort
  const sortField = normalizeOverviewSortField(params.orderBy)
  const sortDirection: 'asc' | 'desc' = usesDefaultSort ? 'asc' : params.sortDirection === 'asc' ? 'asc' : 'desc'
  const cursorDirection = params.cursorDirection === 'prev' ? 'prev' : 'next'
  const searchTerm = normalizeTextFilter(params.search ?? params.author)
  const sortExpression = Prisma.raw(OVERVIEW_SORT_EXPRESSIONS[sortField])
  const defaultSecondarySortExpression = usesDefaultSort
    ? Prisma.raw(OVERVIEW_SORT_EXPRESSIONS[DEFAULT_OVERVIEW_SECONDARY_SORT_FIELD])
    : undefined
  const tagIds = await resolveTagSearchIds(normalizeTextFilter(params.tag), client)
  const cursor = params.cursorValue && params.cursorId ? { value: params.cursorValue, id: params.cursorId } : null
  const filterParams = {
    accessLevel: normalizeAccessLevel(params.accessLevel),
    batchIds: await resolveBatchSearchIds(normalizeTextFilter(params.batch), client),
    collection: normalizeTextFilter(params.collection),
    createdFrom: normalizeDateFilter(params.createdFrom),
    createdTo: normalizeDateFilter(params.createdTo),
    defaultSecondarySortExpression,
    documentType: normalizeDocumentType(params.documentType),
    searchTerm,
    sortDirection,
    sortExpression,
    sortField,
    statuses: normalizeStatuses(params.statuses),
    tagIds,
  }

  return {
    page,
    pageSize,
    usesDefaultSort,
    sortField,
    sortDirection,
    cursorDirection,
    cursor,
    filterParams,
  }
}

function buildLibraryWhereSql(context: LibraryQueryContext, includeCursor: boolean): Prisma.Sql {
  const additionalConditions: Prisma.Sql[] = [
    buildPreservationCandidateConditionSql('d'),
    Prisma.sql`latest_state.new_state = ${Prisma.raw(`'${DOCUMENT_STATES.INGESTED_FEDORA}'`)}`,
  ]
  if (context.filterParams.batchIds) {
    additionalConditions.push(buildLibraryBatchConditionSql(context.filterParams.batchIds))
  }

  return buildOverviewDocumentsWhereSql({
    ...context.filterParams,
    batchIds: undefined,
    additionalConditions,
    cursor: includeCursor ? context.cursor : null,
    cursorDirection: context.cursorDirection,
  })
}

async function getLibraryDocumentCount(context: LibraryQueryContext, client: QueryDbClient): Promise<number> {
  const countWhereSql = buildLibraryWhereSql(context, false)
  const countRows = await client.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
    SELECT COUNT(DISTINCT d.id) AS total
    ${libraryDocumentsBaseFromSql}
    ${countWhereSql}
  `)
  const totalValue = countRows[0]?.total
  return typeof totalValue === 'bigint' ? Number(totalValue) : Number(totalValue ?? 0)
}

async function getLibraryDocumentRows(
  context: LibraryQueryContext,
  client: QueryDbClient,
): Promise<LibraryDocumentRow[]> {
  const whereSql = buildLibraryWhereSql(context, true)
  const orderBySql = buildOverviewDocumentsOrderBySql({
    cursorDirection: context.cursorDirection,
    defaultSecondarySortExpression: context.filterParams.defaultSecondarySortExpression,
    sortDirection: context.sortDirection,
    sortExpression: context.filterParams.sortExpression,
  })
  const rows = await client.$queryRaw<LibraryDocumentRow[]>(Prisma.sql`
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
      d.created_at,
      d.updated_at,
      dq.validation_status,
      dq.validation_timestamp,
      dq.validator_name,
      CASE WHEN dup.document_id IS NULL THEN 0 ELSE 1 END AS is_duplicate,
      latest_state.changed_at AS uploaded_at,
      fedora_meta.value AS fedora_url,
      fedora_meta.value_type AS fedora_url_type,
      ${context.filterParams.sortExpression} AS sort_value
    ${libraryDocumentsBaseFromSql}
    ${whereSql}
    ${orderBySql}
    LIMIT ${context.pageSize + 1}
  `)

  return rows
}

async function hydrateLibraryItems(rows: LibraryDocumentRow[], client: QueryDbClient): Promise<LibraryDocumentItem[]> {
  if (rows.length === 0) return []

  const orderedRows = rows
  const documentIds = orderedRows.map((row) => String(row.id))

  const [batchRows, collectionRows] = await Promise.all([
    client.document_to_batches.findMany({
      where: { document_id: { in: documentIds } },
      select: {
        document_id: true,
        batch_id: true,
        added_at: true,
        batches: { select: { id: true, name: true, created_at: true } },
      },
    }),
    client.document_to_tags.findMany({
      where: { document_id: { in: documentIds } },
      select: {
        document_id: true,
        tags: { select: { id: true, name: true, collections: { select: { id: true } } } },
      },
    }),
  ])

  const batchAssociationsByDocument = new Map<string, LibraryBatchAssociation[]>()
  for (const row of batchRows) {
    const associations = batchAssociationsByDocument.get(row.document_id) ?? []
    associations.push({
      batchId: row.batch_id,
      batchName: row.batches.name ?? null,
      addedAt: row.added_at,
      batchCreatedAt: row.batches.created_at,
    })
    batchAssociationsByDocument.set(row.document_id, associations)
  }

  const collectionsByDocument = new Map<string, LibraryCollection[]>()
  for (const row of collectionRows) {
    const collection = row.tags.collections
    if (!collection) continue

    const collections = collectionsByDocument.get(row.document_id) ?? []
    collections.push({ id: collection.id, name: row.tags.name })
    collectionsByDocument.set(row.document_id, collections)
  }

  return orderedRows.map((row) => {
    const latestBatch = selectLatestLibraryBatch(batchAssociationsByDocument.get(String(row.id)) ?? [])
    const collections = (collectionsByDocument.get(String(row.id)) ?? []).sort(
      (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    )

    return normalizeLibraryDocument({
      id: String(row.id),
      legacyId: row.id_legacy ?? null,
      sourceId: parseMetadataValue(normalizeRawLibraryMetadataValue(row.source_id), null).plainText || null,
      name: row.name ?? null,
      fedoraUrl:
        parseMetadataValue(
          normalizeRawLibraryMetadataValue(row.fedora_url),
          normalizeRawLibraryMetadataValue(row.fedora_url_type),
        ).plainText || null,
      uploadedAt: row.uploaded_at,
      collections,
      batch: latestBatch
        ? {
            id: latestBatch.batchId,
            name: latestBatch.batchName,
            createdAt: latestBatch.batchCreatedAt,
          }
        : null,
    })
  })
}

export async function getLibraryDocuments(
  params: DocumentsQueryParams = {},
  client: QueryDbClient = db,
): Promise<LibraryDocumentsPageResult> {
  const context = await buildLibraryQueryContext(params, client)
  const total = await getLibraryDocumentCount(context, client)

  if (total === 0) {
    return {
      items: [],
      total: 0,
      page: context.page,
      pageSize: context.pageSize,
      hasNextPage: false,
      hasPreviousPage: context.page > 1,
      startCursor: null,
      endCursor: null,
    }
  }

  const rows = await getLibraryDocumentRows(context, client)
  const hasMore = rows.length > context.pageSize
  const slicedRows = hasMore ? rows.slice(0, context.pageSize) : rows
  const orderedRows = context.cursorDirection === 'prev' ? [...slicedRows].reverse() : slicedRows
  const items = await hydrateLibraryItems(orderedRows, client)

  const startCursor = buildDocumentsCursor(orderedRows[0], context.sortField, context.usesDefaultSort)
  const endCursor = buildDocumentsCursor(orderedRows.at(-1), context.sortField, context.usesDefaultSort)

  return {
    items,
    total,
    page: context.page,
    pageSize: context.pageSize,
    hasNextPage: context.cursorDirection === 'prev' ? Boolean(context.cursor) : hasMore,
    hasPreviousPage: context.page > 1,
    startCursor,
    endCursor,
  }
}
