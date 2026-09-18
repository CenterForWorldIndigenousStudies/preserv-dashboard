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
  buildLatestStateConditionSql,
  buildPreservationCandidateConditionSql,
  getPreservationCandidateDocumentIds,
  getOverviewDocumentsPage,
  type QueryDbClient,
} from '@lib/queries/documentQuerySupport'
import type { DocumentsQueryParams } from '@lib/queries/documentQueries'
import type { AccessLevelOption } from '@constants/accessLevels'
import type { ReadyForLibraryItem } from 'types/documents'

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
      contributor: contributor ?? search,
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

export async function getReadyForLibraryDocuments(
  params: DocumentsQueryParams = {},
  client: QueryDbClient = db,
): Promise<{
  items: ReadyForLibraryItem[]
  total: number
}> {
  const requiredDcFields = ['dc_title', 'dc_type', 'dc_subject', 'dc_rights']
  const normalizedStatuses = normalizeStatuses(params.statuses)

  if (normalizedStatuses && !normalizedStatuses.includes('APPROVED')) {
    return { items: [], total: 0 }
  }

  const dcMetadata = await client.metadata.findMany({
    where: { name: { in: requiredDcFields } },
    select: { id: true, name: true },
  })

  const dcMetaMap = new Map(dcMetadata.map((m) => [m.id, m.name]))
  const dcMetaIds = new Set(dcMetadata.map((m) => m.id))

  const qualityDocs = await client.document_quality.findMany({
    where: {
      validation_status: 'APPROVED',
    },
    select: { document_id: true, validation_status: true, validation_timestamp: true },
  })

  if (qualityDocs.length === 0) {
    return { items: [], total: 0 }
  }

  const approvedDocIds = [...new Set(qualityDocs.map((d) => d.document_id))]
  const candidateDocumentIds = await getPreservationCandidateDocumentIds(approvedDocIds, client)
  const approvedCandidateDocIds = approvedDocIds.filter((id) => candidateDocumentIds.has(id))

  if (approvedCandidateDocIds.length === 0) {
    return { items: [], total: 0 }
  }

  // Get documents that have at least one access_level set via document_access
  const accessRows = await client.document_access.findMany({
    where: { document_id: { in: approvedCandidateDocIds } },
    select: { document_id: true, access_level_id: true, access_levels: { select: { level_name: true } } },
  })
  const docAccessMap = new Map<string, AccessLevelOption>()
  for (const row of accessRows) {
    const accessLevel = normalizeAccessLevel(row.access_levels.level_name)
    if (!accessLevel) continue

    if (!docAccessMap.has(row.document_id)) {
      docAccessMap.set(row.document_id, accessLevel)
    }
  }

  const approvedWithAccess = approvedCandidateDocIds.filter((id) => docAccessMap.has(id))

  if (approvedWithAccess.length === 0) {
    return { items: [], total: 0 }
  }

  const metadataRows = await client.document_to_metadata.findMany({
    where: {
      document_id: { in: approvedWithAccess },
      metadata_id: { in: [...dcMetaIds] },
    },
    select: { document_id: true, metadata_id: true },
  })

  // Group by document_id and check which have all required fields
  const docDcFields = new Map<string, Set<string>>()
  for (const row of metadataRows) {
    const metaName = dcMetaMap.get(row.metadata_id)
    if (!metaName) continue
    if (!docDcFields.has(row.document_id)) {
      docDcFields.set(row.document_id, new Set())
    }
    docDcFields.get(row.document_id)!.add(metaName)
  }

  const items = buildReadyForLibraryItems(qualityDocs, docAccessMap, docDcFields, requiredDcFields)

  // Hydrate names from documents table
  const docRows = await client.documents.findMany({
    where: { id: { in: approvedWithAccess } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(docRows.map((d) => [d.id, d.name ?? null]))

  for (const item of items) {
    item.name = nameMap.get(item.id) ?? null
  }

  const tagIds = await resolveTagSearchIds(normalizeTextFilter(params.tag), client)
  const batchIds = await resolveBatchSearchIds(normalizeTextFilter(params.batch), client)
  const filteredResult = await getOverviewDocumentsPage(
    {
      page: 1,
      pageSize: approvedWithAccess.length,
      contributor: normalizeTextFilter(params.contributor ?? params.search),
      publisher: normalizeTextFilter(params.publisher),
      tagIds,
      statuses: normalizedStatuses ?? ['APPROVED'],
      documentType: normalizeDocumentType(params.documentType),
      batchIds,
      createdFrom: normalizeDateFilter(params.createdFrom),
      createdTo: normalizeDateFilter(params.createdTo),
      collection: normalizeTextFilter(params.collection),
      accessLevel: normalizeAccessLevel(params.accessLevel),
      documentIds: approvedWithAccess,
      additionalConditions: [
        buildPreservationCandidateConditionSql('d'),
        Prisma.sql`NOT ${buildLatestStateConditionSql('latest_ready_state', GENERATED_DOCUMENT_STATES.INGESTED_FEDORA)}`,
      ],
    },
    client,
  )
  const filteredDocumentIds = new Set(filteredResult.data.map((document) => document.id))
  const filteredItems = items.filter((item) => filteredDocumentIds.has(item.id))

  return { items: filteredItems, total: filteredItems.length }
}

/**
 * Resolve the batch-scoped handoff targets for the current dashboard-visible
 * Ready for Library set. The downstream translator accepts batches, not
 * individual documents, so this function returns deduplicated batch IDs.
 */
export async function getReadyForLibraryBatchIds(documentIds?: readonly string[]): Promise<string[]> {
  const eligibleDocumentIds = documentIds
    ? [...new Set(documentIds.map((documentId) => documentId.trim()).filter(Boolean))]
    : (await getReadyForLibraryDocuments()).items.map((item) => item.id)

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
