import {
  PrismaClient,
  type Prisma,
  type document_quality_validation_status as DocumentQualityValidationStatus,
} from '@lib/prisma/generated/client'

import { db } from '@lib/db'
import { toBatchProperties } from '@lib/batchProperties'
import { calculateTotalProcessingCost } from '@lib/processingCost'
import { calculateCurrentProcessingTime } from '@lib/processingTime'
import { resolveBatchSearchIds, resolveTagSearchIds } from '@lib/queries/searchResolvers'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeTextFilter,
  parseStatusesParam,
} from '@lib/search'
import type {
  BatchDetail,
  BatchListItem,
  BatchListPageResult,
  BatchOverviewMetrics,
  BatchProperty,
  BatchQueryFilters,
  BatchTableQuery,
} from 'types/batches'

const DEFAULT_PAGE_SIZE = 25
const SUPPORTED_PAGE_SIZES = [25, 50, 100, 250, 500] as const

type BatchQueryDbClient = PrismaClient | Prisma.TransactionClient

const EMPTY_BATCH_QUERY: BatchTableQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filters: {},
}

interface BatchDatabaseRow {
  id: string
  id_legacy: string | null
  name: string | null
  started_by: string | null
  started_at: Date | string | null
  lifecycle_status: string | null
  publication_status: string | null
  processing_details: string | null
  document_to_batches: Array<{
    cost: Prisma.Decimal | number | string | null
    processing_time_seconds: number | null
  }>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function normalizePageSize(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_PAGE_SIZE
  }

  let resolved = DEFAULT_PAGE_SIZE
  for (const supportedPageSize of SUPPORTED_PAGE_SIZES) {
    if (value < supportedPageSize) {
      break
    }

    resolved = supportedPageSize
  }

  return resolved
}

export function parseBatchQueryParams(params: Record<string, string | string[] | undefined>): BatchTableQuery {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const sortDirection = firstSearchParam(params.sortDirection)
  const cursorDirection = firstSearchParam(params.cursorDirection)
  const filters = {
    author: normalizeTextFilter(firstSearchParam(params.author)),
    tag: normalizeTextFilter(firstSearchParam(params.tag)),
    statuses: parseStatusesParam(params.statuses),
    lifecycleStatuses: parseStatusesParam(params.lifecycleStatuses),
    publicationStatuses: parseStatusesParam(params.publicationStatuses),
    documentType: normalizeDocumentType(firstSearchParam(params.documentType)),
    batch: normalizeTextFilter(firstSearchParam(params.batch)),
    createdFrom: normalizeDateFilter(firstSearchParam(params.createdFrom)),
    createdTo: normalizeDateFilter(firstSearchParam(params.createdTo)),
    collection: normalizeTextFilter(firstSearchParam(params.collection)),
    accessLevel: normalizeAccessLevel(firstSearchParam(params.accessLevel)),
  }

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: normalizePageSize(pageSize),
    search: normalizeTextFilter(firstSearchParam(params.search)),
    orderBy: normalizeTextFilter(firstSearchParam(params.orderBy)),
    sortDirection: sortDirection === 'asc' || sortDirection === 'desc' ? sortDirection : undefined,
    cursorValue: normalizeTextFilter(firstSearchParam(params.cursorValue)),
    cursorId: normalizeTextFilter(firstSearchParam(params.cursorId)),
    cursorDirection: cursorDirection === 'next' || cursorDirection === 'prev' ? cursorDirection : undefined,
    filters,
  }
}

function parseProcessingDetails(rawDetails: string | null): Record<string, unknown> {
  if (!rawDetails?.trim()) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(rawDetails)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return {}
    }

    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

function getBatchStatistics(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string') {
    return parseProcessingDetails(value)
  }

  return {}
}

function getTotalProcessingTime(
  row: Pick<BatchDatabaseRow, 'document_to_batches' | 'processing_details'>,
): number | string {
  const details = parseProcessingDetails(row.processing_details)
  const currentProcessingTime = calculateCurrentProcessingTime(details)
  if (currentProcessingTime !== null) {
    return currentProcessingTime
  }

  const statistics = getBatchStatistics(details.batch_statistics)
  const speed = Number(statistics.speed)

  if (Number.isFinite(speed) && speed > 0) {
    return speed
  }

  const total = row.document_to_batches.reduce((sum, item) => sum + (item.processing_time_seconds ?? 0), 0)
  return total > 0 ? total : 'Unknown'
}

function getDocumentCount(row: BatchDatabaseRow, details: Record<string, unknown>): number {
  const totalDocuments = Number(details.total_documents)
  if (Number.isFinite(totalDocuments) && totalDocuments >= 0) {
    return totalDocuments
  }

  return row.document_to_batches.length
}

function mapBatchListItem(row: BatchDatabaseRow): BatchListItem {
  const details = parseProcessingDetails(row.processing_details)

  return {
    id: row.id,
    idLegacy: row.id_legacy ?? null,
    name: row.name,
    startedAt: row.started_at,
    documentCount: getDocumentCount(row, details),
    totalCost: calculateTotalProcessingCost(details, row.document_to_batches),
    processingTime: getTotalProcessingTime(row),
    lifecycleStatus: row.lifecycle_status,
    publicationStatus: row.publication_status,
  }
}

function mapBatchDetail(row: BatchDatabaseRow): BatchDetail {
  const details = parseProcessingDetails(row.processing_details)
  const properties: BatchProperty[] = toBatchProperties(details)

  properties.push({ key: 'Total Cost', value: calculateTotalProcessingCost(details, row.document_to_batches) })
  properties.push({ key: 'Processing Time (seconds)', value: getTotalProcessingTime(row) })

  return {
    id: row.id,
    name: row.name,
    startedBy: row.started_by ?? null,
    startedAt: row.started_at,
    properties,
    lifecycleStatus: row.lifecycle_status,
    publicationStatus: row.publication_status,
  }
}

function getSortableValue(item: BatchListItem, orderBy?: string): number | string {
  switch (orderBy) {
    case 'id':
      return item.id.toLowerCase()
    case 'name':
      return item.name?.toLowerCase() ?? ''
    case 'startedAt':
      return item.startedAt ? new Date(item.startedAt).getTime() : 0
    case 'documentCount':
      return item.documentCount
    case 'totalCost':
      return Number(item.totalCost.replace(/[^0-9.-]/g, ''))
    case 'processingTime':
      return typeof item.processingTime === 'number' ? item.processingTime : Number.MAX_SAFE_INTEGER
    default:
      return item.startedAt ? new Date(item.startedAt).getTime() : 0
  }
}

function compareValues(left: number | string, right: number | string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortBatchItems(
  items: BatchListItem[],
  orderBy?: string,
  sortDirection: 'asc' | 'desc' = 'desc',
): BatchListItem[] {
  const multiplier = sortDirection === 'desc' ? -1 : 1

  return [...items].sort((left, right) => {
    const valueComparison = compareValues(getSortableValue(left, orderBy), getSortableValue(right, orderBy))
    return valueComparison === 0 ? left.id.localeCompare(right.id) : valueComparison * multiplier
  })
}

function getCursorValue(item: BatchListItem, orderBy?: string): string {
  const value = getSortableValue(item, orderBy)
  return typeof value === 'number' ? String(value) : value
}

function buildPageInfo(
  data: BatchListItem[],
  allItems: BatchListItem[],
  pageSize: number,
  orderBy?: string,
  hasPreviousPage = false,
): BatchListPageResult['pageInfo'] {
  const first = data[0]
  const last = data[data.length - 1]
  const lastIndex = last ? allItems.findIndex((item) => item.id === last.id) : -1

  return {
    pageSize,
    hasNextPage: lastIndex >= 0 && lastIndex < allItems.length - 1,
    hasPreviousPage,
    startCursor: first ? { id: first.id, value: getCursorValue(first, orderBy) } : null,
    endCursor: last ? { id: last.id, value: getCursorValue(last, orderBy) } : null,
  }
}

const batchSelect = {
  id: true,
  id_legacy: true,
  name: true,
  started_by: true,
  started_at: true,
  lifecycle_status: true,
  publication_status: true,
  processing_details: true,
  document_to_batches: {
    select: {
      cost: true,
      processing_time_seconds: true,
    },
  },
} as const

function getAuthorSearchTokens(searchTerm: string): string[] {
  return Array.from(
    new Set(
      searchTerm
        .trim()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  )
}

function buildBatchDocumentWhere(
  filters: BatchQueryFilters,
  tagIds: string[] | undefined,
): Prisma.documentsWhereInput | undefined {
  const conditions: Prisma.documentsWhereInput[] = []

  if (filters.author?.trim()) {
    const authorTokens = getAuthorSearchTokens(filters.author)
    if (authorTokens.length > 0) {
      conditions.push({
        document_to_authors: {
          some: {
            OR: authorTokens.map((token) => ({ authors: { name: { contains: token } } })),
          },
        },
      })
    }
  }

  if (tagIds) {
    conditions.push({
      document_to_tags: {
        some: { tag_id: { in: tagIds } },
      },
    })
  }

  if (filters.statuses?.length) {
    conditions.push({
      document_quality: {
        validation_status: { in: filters.statuses as DocumentQualityValidationStatus[] },
      },
    })
  }

  if (filters.documentType === 'duplicate' || filters.documentType === 'unique') {
    const duplicateCondition: Prisma.documentsWhereInput = {
      document_to_tags: {
        some: { tags: { name: 'duplicate_document' } },
      },
    }
    conditions.push(filters.documentType === 'duplicate' ? duplicateCondition : { NOT: duplicateCondition })
  }

  if (filters.createdFrom || filters.createdTo) {
    conditions.push({
      created_at: {
        ...(filters.createdFrom ? { gte: new Date(`${filters.createdFrom}T00:00:00.000Z`) } : {}),
        ...(filters.createdTo
          ? { lt: new Date(new Date(`${filters.createdTo}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) }
          : {}),
      },
    })
  }

  if (filters.collection?.trim()) {
    conditions.push({
      document_to_tags: {
        some: { tags: { name: { equals: filters.collection } } },
      },
    })
  }

  if (filters.accessLevel) {
    conditions.push({
      document_access: {
        some: { access_levels: { level_name: { equals: filters.accessLevel } } },
      },
    })
  }

  return conditions.length > 0 ? { AND: conditions } : undefined
}

function buildBatchWhere(
  search: string | undefined,
  filters: BatchQueryFilters,
  tagIds: string[] | undefined,
  batchIds: string[] | undefined,
) {
  const normalizedSearch = normalizeTextFilter(search)
  const documentWhere = buildBatchDocumentWhere(filters, tagIds)
  const advancedConditions: Prisma.batchesWhereInput[] = []

  if (batchIds) {
    advancedConditions.push({ id: { in: batchIds } })
  }

  if (filters.lifecycleStatuses?.length) {
    advancedConditions.push({ lifecycle_status: { in: filters.lifecycleStatuses } })
  }

  if (filters.publicationStatuses?.length) {
    advancedConditions.push({ publication_status: { in: filters.publicationStatuses } })
  }

  if (documentWhere) {
    advancedConditions.push({
      document_to_batches: {
        some: { documents: documentWhere },
      },
    })
  }

  const searchCondition = normalizedSearch
    ? {
        OR: [
          { id: { contains: normalizedSearch } },
          { name: { contains: normalizedSearch } },
          { id_legacy: { contains: normalizedSearch } },
        ],
      }
    : undefined

  if (!searchCondition && advancedConditions.length === 0) {
    return undefined
  }

  if (!searchCondition) {
    return advancedConditions.length === 1 ? advancedConditions[0] : { AND: advancedConditions }
  }

  if (advancedConditions.length === 0) {
    return searchCondition
  }

  return { AND: [searchCondition, ...advancedConditions] }
}

async function getFilteredBatchItems(
  query: BatchTableQuery,
  client: BatchQueryDbClient,
): Promise<{ items: BatchListItem[]; totalCount: number }> {
  const filters = query.filters ?? {}
  const [tagIds, batchIds] = await Promise.all([
    resolveTagSearchIds(normalizeTextFilter(filters.tag), client),
    resolveBatchSearchIds(normalizeTextFilter(filters.batch), client),
  ])
  const where = buildBatchWhere(query.search, filters, tagIds, batchIds)
  const [rows, totalCount] = await Promise.all([
    client.batches.findMany({ where, select: batchSelect }),
    client.batches.count({ where }),
  ])

  return {
    items: sortBatchItems(
      (rows as unknown as BatchDatabaseRow[]).map(mapBatchListItem),
      query.orderBy,
      query.sortDirection ?? 'desc',
    ),
    totalCount: Number(totalCount),
  }
}

export async function getBatches(
  query: BatchTableQuery,
  client: BatchQueryDbClient = db,
): Promise<BatchListPageResult> {
  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1
  const pageSize = normalizePageSize(query.pageSize)
  const { items: allItems, totalCount } = await getFilteredBatchItems(query, client)

  let offset = (page - 1) * pageSize
  let hasPreviousPage = page > 1

  if (query.cursorId && query.cursorValue) {
    const cursorIndex = allItems.findIndex(
      (item) => item.id === query.cursorId && getCursorValue(item, query.orderBy) === query.cursorValue,
    )

    if (cursorIndex >= 0) {
      if (query.cursorDirection === 'prev') {
        offset = Math.max(0, cursorIndex - pageSize)
        hasPreviousPage = offset > 0
      } else {
        offset = cursorIndex + 1
        hasPreviousPage = true
      }
    }
  }

  const data = allItems.slice(offset, offset + pageSize)

  return {
    data,
    totalCount,
    pageInfo: buildPageInfo(data, allItems, pageSize, query.orderBy, hasPreviousPage),
  }
}

export async function getBatchOverviewMetrics(
  queryOrClient: BatchTableQuery | BatchQueryDbClient = EMPTY_BATCH_QUERY,
  maybeClient: BatchQueryDbClient = db,
): Promise<BatchOverviewMetrics> {
  const isClient = 'batches' in queryOrClient
  const query = isClient ? EMPTY_BATCH_QUERY : queryOrClient
  const client = isClient ? queryOrClient : maybeClient
  const { items } = await getFilteredBatchItems(query, client)

  return {
    totalBatches: items.length,
    totalDocuments: items.reduce((sum, item) => sum + item.documentCount, 0),
  }
}

export async function getBatchDetail(batchId: string, client: BatchQueryDbClient = db): Promise<BatchDetail | null> {
  const row = await client.batches.findUnique({ where: { id: batchId }, select: batchSelect })
  return row ? mapBatchDetail(row) : null
}
