import type { DocumentTableQuery } from '@organisms/DocumentTable/types'
import { GENERATED_DOCUMENT_STATES } from '@constants/generated/documentStates'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeStatuses,
  normalizeTextFilter,
  parseStatusesParam,
  type AdvancedSearchFilters,
} from '@lib/search'
import { db } from '@lib/db'
import { Prisma } from '@lib/prisma/generated/client'
import { resolveBatchSearchIds, resolveTagSearchIds } from '@lib/queries/searchResolvers'
import {
  getDocumentCollectionMembershipsByDocument,
  type CollectionMembershipDataClient,
} from '@lib/queries/collectionMembershipQueries'
import {
  buildLatestStateConditionSql,
  buildPreservationCandidateConditionSql,
  getPreservationCandidateDocumentIds,
  getOverviewDocumentsPage,
  type QueryDbClient,
} from '@lib/queries/documentQuerySupport'
import type { DocumentsQueryParams } from '@lib/queries/documentQueries'
import type { AccessLevelOption } from '@constants/accessLevels'
import type { ReadyForLibraryItem } from 'types/documents'

export type ReadyForLibrarySortField =
  | 'name'
  | 'validation_status'
  | 'validation_timestamp'
  | 'access_level'
  | 'metadata_complete'

export interface ReadyForLibraryQueryParams extends Omit<DocumentsQueryParams, 'orderBy'> {
  orderBy?: ReadyForLibrarySortField
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseReadyForLibraryQueryParams(
  params: Record<string, string | string[] | undefined>,
): DocumentTableQuery<AdvancedSearchFilters> {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const sortDirection = firstSearchParam(params.sortDirection)
  const search = normalizeTextFilter(firstSearchParam(params.search))
  const contributor = normalizeTextFilter(firstSearchParam(params.contributor))
  const publisher = normalizeTextFilter(firstSearchParam(params.publisher))
  const tag = normalizeTextFilter(firstSearchParam(params.tag))
  const batch = normalizeTextFilter(firstSearchParam(params.batch))
  const collection = normalizeTextFilter(firstSearchParam(params.collection))
  const createdFrom = normalizeDateFilter(firstSearchParam(params.createdFrom))
  const createdTo = normalizeDateFilter(firstSearchParam(params.createdTo))
  const accessLevel = normalizeAccessLevel(firstSearchParam(params.accessLevel))
  const documentType = normalizeDocumentType(firstSearchParam(params.documentType))
  const statuses = parseStatusesParam(params.statuses)

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    search,
    orderBy: firstSearchParam(params.orderBy),
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    filters: {
      contributor,
      publisher,
      tag,
      statuses,
      documentType,
      batch,
      createdFrom,
      createdTo,
      collection,
      accessLevel,
    },
  }
}
// getReadyForLibraryDocuments
// Returns documents with validation_status = 'APPROVED', has access_level via document_access,
// and required Dublin Core metadata fields present.
// ---------------------------------------------------------------------------
interface ReadyForLibraryQualityRow {
  document_id: string
  validation_status: string | null
  validation_timestamp: bigint | number | string | null
}

export function buildReadyForLibraryItems(
  qualityDocs: readonly ReadyForLibraryQualityRow[],
  docAccessMap: ReadonlyMap<string, AccessLevelOption | undefined>,
  docDcFields: ReadonlyMap<string, ReadonlySet<string>>,
  requiredDcFields: readonly string[],
): ReadyForLibraryItem[] {
  const items: ReadyForLibraryItem[] = []

  for (const qd of qualityDocs) {
    const accessLevel = docAccessMap.get(qd.document_id)
    if (!accessLevel) continue

    const dcFieldsPresent = docDcFields.get(qd.document_id)
    const metadata_complete =
      dcFieldsPresent !== undefined && requiredDcFields.every((field) => dcFieldsPresent.has(field))

    items.push({
      id: qd.document_id,
      name: null,
      validation_status: qd.validation_status,
      validation_timestamp:
        qd.validation_timestamp !== null && qd.validation_timestamp !== undefined
          ? Number(qd.validation_timestamp)
          : null,
      metadata_complete,
      access_level: accessLevel,
    })
  }

  return items
}

const REQUIRED_DC_FIELDS = ['dc_title', 'dc_type', 'dc_subject', 'dc_rights']

interface ReadyForLibraryCandidateContext {
  documentIds: string[]
  accessLevels: Map<string, AccessLevelOption>
}

function getReadySortExpression(orderBy?: ReadyForLibrarySortField): Prisma.Sql {
  switch (orderBy ?? 'name') {
    case 'validation_status':
      return Prisma.raw("COALESCE(dq.validation_status, '')")
    case 'validation_timestamp':
      return Prisma.raw('COALESCE(dq.validation_timestamp, 0)')
    case 'access_level':
      return Prisma.raw("COALESCE(al.level_name, '')")
    case 'metadata_complete':
      return Prisma.raw(`CASE WHEN (
        SELECT COUNT(DISTINCT required_metadata.name)
        FROM document_to_metadata required_document_metadata
        INNER JOIN metadata required_metadata
          ON required_metadata.id = required_document_metadata.metadata_id
        WHERE required_document_metadata.document_id = d.id
          AND required_metadata.name IN ('dc_title', 'dc_type', 'dc_subject', 'dc_rights')
      ) = 4 THEN 1 ELSE 0 END`)
    case 'name':
    default:
      return Prisma.raw("COALESCE(d.name, '')")
  }
}

async function getReadyForLibraryCandidateContext(
  client: QueryDbClient,
  requestedDocumentIds?: readonly string[],
): Promise<ReadyForLibraryCandidateContext> {
  const qualityDocs = await client.document_quality.findMany({
    where: {
      validation_status: 'APPROVED',
      ...(requestedDocumentIds ? { document_id: { in: [...requestedDocumentIds] } } : {}),
    },
    select: { document_id: true },
  })
  const approvedDocumentIds = [...new Set(qualityDocs.map(({ document_id }) => document_id))]
  if (approvedDocumentIds.length === 0) {
    return { documentIds: [], accessLevels: new Map() }
  }

  const preservationCandidateIds = await getPreservationCandidateDocumentIds(approvedDocumentIds, client)
  const approvedCandidateIds = approvedDocumentIds.filter((documentId) => preservationCandidateIds.has(documentId))
  if (approvedCandidateIds.length === 0) {
    return { documentIds: [], accessLevels: new Map() }
  }

  const accessRows = await client.document_access.findMany({
    where: { document_id: { in: approvedCandidateIds } },
    select: { document_id: true, access_levels: { select: { level_name: true } } },
  })
  const accessLevels = new Map<string, AccessLevelOption>()
  for (const row of accessRows) {
    const accessLevel = normalizeAccessLevel(row.access_levels.level_name)
    if (accessLevel && !accessLevels.has(row.document_id)) {
      accessLevels.set(row.document_id, accessLevel)
    }
  }

  const candidateIdsWithAccess = approvedCandidateIds.filter((documentId) => accessLevels.has(documentId))
  if (candidateIdsWithAccess.length === 0) {
    return { documentIds: [], accessLevels }
  }

  const membershipsByDocument = await getDocumentCollectionMembershipsByDocument(
    candidateIdsWithAccess,
    client as unknown as CollectionMembershipDataClient,
  )
  const documentIds = candidateIdsWithAccess.filter((documentId) => {
    const memberships = membershipsByDocument.get(documentId) ?? []
    return memberships.length > 0 && memberships.every((membership) => Boolean(membership.fedoraNodeId?.trim()))
  })

  return { documentIds, accessLevels }
}

export async function getEligibleReadyForLibraryDocumentIds(
  documentIds: readonly string[],
  client: QueryDbClient = db,
): Promise<string[]> {
  const requestedIds = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))]
  if (requestedIds.length === 0) return []
  const context = await getReadyForLibraryCandidateContext(client, requestedIds)
  const latestStates = await client.state_history.findMany({
    where: { document_id: { in: requestedIds } },
    orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
    select: { document_id: true, new_state: true },
  })
  const stateByDocument = new Map<string, string | null>()
  for (const state of latestStates) {
    if (!stateByDocument.has(state.document_id)) stateByDocument.set(state.document_id, state.new_state)
  }
  return requestedIds.filter((id) =>
    context.documentIds.includes(id) && stateByDocument.get(id) === GENERATED_DOCUMENT_STATES.APPROVED,
  )
}

function buildReadyForLibrarySqlParams(
  params: ReadyForLibraryQueryParams,
  documentIds: string[],
  orderBy: ReadyForLibrarySortField = 'name',
) {
  return {
    page: 1,
    pageSize: Math.max(1, documentIds.length),
    orderBy: 'name' as const,
    sortExpression: getReadySortExpression(orderBy),
    sortDirection: params.sortDirection === 'desc' ? 'desc' as const : 'asc' as const,
    nameSearch: normalizeTextFilter(params.search),
    contributor: normalizeTextFilter(params.contributor),
    publisher: normalizeTextFilter(params.publisher),
    statuses: normalizeStatuses(params.statuses) ?? ['APPROVED'],
    documentType: normalizeDocumentType(params.documentType),
    createdFrom: normalizeDateFilter(params.createdFrom),
    createdTo: normalizeDateFilter(params.createdTo),
    collection: normalizeTextFilter(params.collection),
    accessLevel: normalizeAccessLevel(params.accessLevel),
    documentIds,
    additionalConditions: [
      buildPreservationCandidateConditionSql('d'),
      buildLatestStateConditionSql('latest_ready_state', GENERATED_DOCUMENT_STATES.APPROVED),
    ],
  }
}

async function getFilteredReadyDocumentsPage(
  params: ReadyForLibraryQueryParams,
  documentIds: string[],
  client: QueryDbClient,
) {
  const [tagIds, batchIds] = await Promise.all([
    resolveTagSearchIds(normalizeTextFilter(params.tag), client),
    resolveBatchSearchIds(normalizeTextFilter(params.batch), client),
  ])
  const page = Math.max(1, Math.floor(params.page ?? 1))
  const pageSize = Math.max(1, Math.min(500, Math.floor(params.pageSize ?? 25)))

  return getOverviewDocumentsPage(
    {
      ...buildReadyForLibrarySqlParams(params, documentIds, params.orderBy),
      page,
      pageSize,
      offset: (page - 1) * pageSize,
      tagIds,
      batchIds,
    },
    client,
  )
}

export async function getReadyForLibraryDocuments(
  params: ReadyForLibraryQueryParams = {},
  client: QueryDbClient = db,
): Promise<{ items: ReadyForLibraryItem[]; total: number }> {
  const normalizedStatuses = normalizeStatuses(params.statuses)
  if (normalizedStatuses && !normalizedStatuses.includes('APPROVED')) {
    return { items: [], total: 0 }
  }

  const { documentIds, accessLevels } = await getReadyForLibraryCandidateContext(client)
  if (documentIds.length === 0) {
    return { items: [], total: 0 }
  }

  const result = await getFilteredReadyDocumentsPage(params, documentIds, client)
  const pageDocumentIds = result.data.map(({ id }) => id)
  if (pageDocumentIds.length === 0) {
    return { items: [], total: result.totalCount ?? 0 }
  }

  const dcMetadata = await client.metadata.findMany({
    where: { name: { in: REQUIRED_DC_FIELDS } },
    select: { id: true, name: true },
  })
  const dcMetaMap = new Map(dcMetadata.map(({ id, name }) => [id, name]))
  const metadataRows = await client.document_to_metadata.findMany({
    where: {
      document_id: { in: pageDocumentIds },
      metadata_id: { in: dcMetadata.map(({ id }) => id) },
    },
    select: { document_id: true, metadata_id: true },
  })
  const docDcFields = new Map<string, Set<string>>()
  for (const row of metadataRows) {
    const metaName = dcMetaMap.get(row.metadata_id)
    if (!metaName) continue
    const fields = docDcFields.get(row.document_id) ?? new Set<string>()
    fields.add(metaName)
    docDcFields.set(row.document_id, fields)
  }

  const pageQualityRows = result.data.map(({ id, validation_status, validation_timestamp }) => ({
    document_id: id,
    validation_status: validation_status ?? null,
    validation_timestamp: validation_timestamp ?? null,
  }))
  const items = buildReadyForLibraryItems(pageQualityRows, accessLevels, docDcFields, REQUIRED_DC_FIELDS)
  const namesById = new Map(result.data.map(({ id, name }) => [id, name]))
  for (const item of items) {
    item.name = namesById.get(item.id) ?? null
  }

  return { items, total: result.totalCount ?? 0 }
}

export async function getReadyForLibraryDocumentIds(
  params: ReadyForLibraryQueryParams = {},
  client: QueryDbClient = db,
): Promise<string[]> {
  const normalizedStatuses = normalizeStatuses(params.statuses)
  if (normalizedStatuses && !normalizedStatuses.includes('APPROVED')) {
    return []
  }
  const { documentIds } = await getReadyForLibraryCandidateContext(client)
  if (documentIds.length === 0) {
    return []
  }

  const [tagIds, batchIds] = await Promise.all([
    resolveTagSearchIds(normalizeTextFilter(params.tag), client),
    resolveBatchSearchIds(normalizeTextFilter(params.batch), client),
  ])
  const result = await getOverviewDocumentsPage(
    {
      ...buildReadyForLibrarySqlParams(params, documentIds),
      page: 1,
      pageSize: documentIds.length,
      tagIds,
      batchIds,
    },
    client,
  )
  return result.data.map(({ id }) => id)
}

/**
 * Resolve the batch-scoped handoff targets for the current dashboard-visible
 * Ready for Library set. The downstream translator accepts batches, not
 * individual documents, so this function returns deduplicated batch IDs.
 */
export async function getReadyForLibraryBatchIds(documentIds?: readonly string[]): Promise<string[]> {
  const eligibleDocumentIds = documentIds
    ? [...new Set(documentIds.map((documentId) => documentId.trim()).filter(Boolean))]
    : await getReadyForLibraryDocumentIds()

  if (eligibleDocumentIds.length === 0) {
    return []
  }

  const rows = await db.document_to_batches.findMany({
    where: {
      document_id: { in: eligibleDocumentIds },
    },
    select: { batch_id: true },
  })

  return [...new Set(rows.map((row) => row.batch_id))]
}
