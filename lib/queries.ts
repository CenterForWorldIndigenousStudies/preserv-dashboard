import type {
  AuditEntry,
  BatchSummary,
  CollectionWithMeta,
  Document,
  DocumentDetail,
  DocumentsCursor,
  DocumentsPageResult,
  DocumentQueryParams,
  DocumentQuality,
  FailureItem,
  PagedResult,
  PipelineSummary,
  ReadyForLibraryItem,
  ReviewItem,
  ReviewQueryParams,
  ReviewQueueItem,
  VersionFamily,
  VersionFamilyDocument,
} from '@lib/types'
import {
  normalizeOverviewAccessLevel,
  normalizeOverviewDateFilter,
  normalizeOverviewDocumentType,
  normalizeOverviewStatuses,
  normalizeOverviewTextFilter,
  OVERVIEW_ACCESS_LEVEL_OPTIONS,
  type OverviewAccessLevelOption,
  type OverviewAdvancedSearchFilters,
  type OverviewDocumentTypeOption,
  type OverviewFilterOptions,
  type OverviewStatusOption,
} from '@lib/overview-search'
import { db } from '@lib/db'
import { createEditHistoryEntry } from '@lib/editHistory'
import { Prisma, PrismaClient } from '@lib/prisma/generated/client'
import { buildNameHash, normalizeTagName } from '@lib/tag-utils'

// Fields on the documents model used for orderBy/filtering
const DOCUMENTS_ORDERABLE_FIELDS = [
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

interface OverviewDocumentRow {
  id: string
  filesize: bigint | number | string | null
  hash_binary: string | null
  hash_content: string | null
  id_legacy: string | null
  source_id: string | null
  name: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  is_duplicate: boolean | number | bigint | string | null
  sort_value: string | number | bigint | Date | null
}

const OVERVIEW_SORT_EXPRESSIONS: Record<(typeof DOCUMENTS_ORDERABLE_FIELDS)[number], string> = {
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

export interface DocumentsQueryParams extends OverviewAdvancedSearchFilters {
  page?: number
  pageSize?: number
  orderBy?: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
  sortDirection?: 'asc' | 'desc'
  search?: string
  cursorValue?: string
  cursorId?: string
  cursorDirection?: 'next' | 'prev'
}

export type QueryDbClient = PrismaClient | Prisma.TransactionClient

export async function getAllDocuments(
  params: DocumentsQueryParams = {},
  client: QueryDbClient = db,
): Promise<DocumentsPageResult> {
  const page = normalizePageNumber(params.page)
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 1000) : 25

  return getOverviewDocumentsPage(
    {
      page,
      pageSize,
      orderBy: params.orderBy,
      sortDirection: params.sortDirection,
      search: normalizeOverviewTextFilter(params.search ?? params.author),
      statuses: normalizeOverviewStatuses(params.statuses),
      documentType: normalizeOverviewDocumentType(params.documentType),
      batch: normalizeOverviewTextFilter(params.batch),
      createdFrom: normalizeOverviewDateFilter(params.createdFrom),
      createdTo: normalizeOverviewDateFilter(params.createdTo),
      collection: normalizeOverviewTextFilter(params.collection),
      accessLevel: normalizeOverviewAccessLevel(params.accessLevel),
      cursor: params.cursorValue && params.cursorId ? { value: params.cursorValue, id: params.cursorId } : null,
      cursorDirection: params.cursorDirection,
    },
    client,
  )
}

const PAGE_SIZE = 20

function normalizePageNumber(page?: number): number {
  if (!page || page < 1 || Number.isNaN(page)) {
    return 1
  }
  return Math.floor(page)
}

export function getPageSize(): number {
  return PAGE_SIZE
}

interface CollectionRow {
  id: string
  tag_id: string
  notes: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  collection_name: string | null
  document_count: bigint | number | string
}

interface CollectionDocumentRow {
  id: string
  filesize: bigint | number | string | null
  hash_binary: string | null
  hash_content: string | null
  id_legacy: string | null
  source_id: string | null
  name: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  is_duplicate: boolean | number | bigint | string | null
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
      by: ['validation_status'],
      _count: { _all: true },
    }),
  ])

  const by_validation_status: Record<string, number> = {}
  for (const row of qualityRows) {
    const key = row.validation_status ?? 'unknown'
    by_validation_status[key] = row._count._all
  }

  return {
    total,
    by_validation_status,
    by_state: {},
  }
}

/**
 * Returns all collections with their linked tag name and distinct document count.
 */
export async function getCollections(): Promise<CollectionWithMeta[]> {
  const rows = await db.$queryRaw<CollectionRow[]>(Prisma.sql`
    SELECT
      c.id,
      c.tag_id,
      c.notes,
      c.created_at,
      c.updated_at,
      t.name AS collection_name,
      COUNT(DISTINCT dtt.document_id) AS document_count
    FROM collections c
    INNER JOIN tags t ON t.id = c.tag_id
    LEFT JOIN document_to_tags dtt ON dtt.tag_id = t.id
    GROUP BY c.id, c.tag_id, c.notes, c.created_at, c.updated_at, t.name
    ORDER BY t.name ASC
  `)

  return rows.map((row) => ({
    id: String(row.id),
    tag_id: String(row.tag_id),
    collection_name: row.collection_name ?? 'Untitled collection',
    notes: row.notes ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    document_count: Number(row.document_count ?? 0),
  }))
}

export async function createCollection(
  input: CreateCollectionInput,
): Promise<{ collection: CollectionWithMeta; createdTag: boolean }> {
  const tagId = input.tagId?.trim() ?? ''
  const tagName = normalizeTagName(input.tagName ?? '')
  const collectionNotes = input.collectionNotes?.trim() ?? ''
  const tagNotes = input.tagNotes?.trim() ?? ''

  if (!tagId && !tagName) {
    throw new Error('Select an existing tag or enter a new tag name.')
  }

  return db.$transaction(async (tx) => {
    let createdTag = false
    let tag = tagId
      ? await tx.tags.findUnique({ where: { id: tagId } })
      : null

    if (!tagId && tagName) {
      const nameHash = buildNameHash(tagName)
      tag = await tx.tags.findFirst({
        where: {
          OR: [{ name_hash: nameHash }, { name: tagName }],
        },
      })

      if (!tag) {
        tag = await tx.tags.create({
          data: {
            id: crypto.randomUUID(),
            name: tagName,
            notes: tagNotes || null,
          },
        })

        await createEditHistoryEntry(tx, {
          entityTable: 'tags',
          entityId: tag.id,
          previousValue: null,
          newValue: tag,
          editSummary: `Created tag "${tag.name}"`,
        })

        createdTag = true
      }
    }

    if (!tag) {
      throw new Error('Tag not found.')
    }

    const existingCollection = await tx.collections.findUnique({
      where: { tag_id: tag.id },
      include: { tags: true },
    })

    if (existingCollection) {
      throw new Error(`A collection for "${existingCollection.tags.name ?? 'this tag'}" already exists.`)
    }

    const createdCollection = await tx.collections.create({
      data: {
        id: crypto.randomUUID(),
        tag_id: tag.id,
        notes: collectionNotes || null,
      },
      include: { tags: true },
    })

    await createEditHistoryEntry(tx, {
      entityTable: 'collections',
      entityId: createdCollection.id,
      previousValue: null,
      newValue: createdCollection,
      editSummary: `Created collection "${createdCollection.tags.name ?? tag.id}"`,
    })

    return {
      collection: {
        id: createdCollection.id,
        tag_id: createdCollection.tag_id,
        collection_name: createdCollection.tags.name ?? 'Untitled collection',
        notes: createdCollection.notes ?? null,
        created_at: createdCollection.created_at ?? null,
        updated_at: createdCollection.updated_at ?? null,
        document_count: 0,
      },
      createdTag,
    }
  })
}

export async function deleteCollection(collectionId: string): Promise<void> {
  return deleteCollectionWithOptions(collectionId)
}

export interface DeleteCollectionOptions {
  deleteTagFromSystem?: boolean
}

export async function deleteCollectionWithOptions(
  collectionId: string,
  options: DeleteCollectionOptions = {},
): Promise<void> {
  const trimmedCollectionId = collectionId.trim()

  if (!trimmedCollectionId) {
    throw new Error('Collection id is required.')
  }

  await db.$transaction(async (tx) => {
    await deleteCollectionWithOptionsInTransaction(tx, trimmedCollectionId, options)
  })
}

export async function deleteCollectionWithOptionsInTransaction(
  client: Prisma.TransactionClient | PrismaClient,
  collectionId: string,
  options: DeleteCollectionOptions = {},
): Promise<void> {
  const collection = await client.collections.findUnique({
    where: { id: collectionId },
    include: { tags: true },
  })

  if (!collection) {
    throw new Error('Collection not found.')
  }

  await client.collections.delete({ where: { id: collectionId } })

  if (options.deleteTagFromSystem) {
    await deleteTagAndDocumentAssociationsInTransaction(client, collection.tag_id)
  }

  await createEditHistoryEntry(client, {
    entityTable: 'collections',
    entityId: collection.id,
    previousValue: collection,
    newValue: null,
    editSummary: `Deleted collection "${collection.tags.name ?? collection.tag_id}"`,
  })
}

export async function deleteTag(tagId: string, deleteAssociations = false): Promise<void> {
  const trimmedTagId = tagId.trim()

  if (!trimmedTagId) {
    throw new Error('Tag id is required.')
  }

  await db.$transaction(async (tx) => {
    await deleteTagInTransaction(tx, trimmedTagId, deleteAssociations)
  })
}

export async function deleteTagAndDocumentAssociations(tagId: string): Promise<void> {
  const trimmedTagId = tagId.trim()

  if (!trimmedTagId) {
    throw new Error('Tag id is required.')
  }

  await db.$transaction(async (tx) => {
    await deleteTagAndDocumentAssociationsInTransaction(tx, trimmedTagId)
  })
}

export async function deleteTagInTransaction(
  client: Prisma.TransactionClient | PrismaClient,
  tagId: string,
  deleteAssociations = false,
): Promise<void> {
  if (deleteAssociations) {
    await deleteTagAndDocumentAssociationsInTransaction(client, tagId)
    return
  }

  const tag = await client.tags.findUnique({
    where: { id: tagId },
    include: {
      document_to_tags: {
        include: {
          documents: { select: { id: true, name: true } },
          tags: true,
        },
      },
      collections: true,
    },
  })

  if (!tag) {
    throw new Error('Tag not found.')
  }

  if (tag.document_to_tags.length > 0) {
    throw new Error('Cannot delete a tag that is still associated with documents.')
  }

  await client.tags.delete({ where: { id: tagId } })

  await createEditHistoryEntry(client, {
    entityTable: 'tags',
    entityId: tag.id,
    previousValue: tag,
    newValue: null,
    editSummary: `Deleted tag "${tag.name}"`,
  })
}

export async function deleteTagAndDocumentAssociationsInTransaction(
  client: Prisma.TransactionClient | PrismaClient,
  tagId: string,
): Promise<void> {
  const tag = await client.tags.findUnique({
    where: { id: tagId },
    include: {
      document_to_tags: {
        include: {
          documents: { select: { id: true, name: true } },
          tags: true,
        },
      },
      collections: {
        include: {
          tags: true,
        },
      },
    },
  })

  if (!tag) {
    throw new Error('Tag not found.')
  }

  await Promise.all(
    tag.document_to_tags.map(async (association) => {
      await client.document_to_tags.delete({ where: { id: association.id } })
      await createEditHistoryEntry(client, {
        entityTable: 'document_to_tags',
        entityId: association.id,
        previousValue: {
          id: association.id,
          document_id: association.document_id,
          tag_id: association.tag_id,
          notes: association.notes,
          created_at: association.created_at,
          tags: association.tags,
          documents: association.documents,
        },
        newValue: null,
        editSummary: `Removed tag "${tag.name}" from document "${association.documents?.name ?? association.document_id}"`,
      })
    }),
  )

  if (tag.collections) {
    await client.collections.delete({ where: { id: tag.collections.id } })
    await createEditHistoryEntry(client, {
      entityTable: 'collections',
      entityId: tag.collections.id,
      previousValue: tag.collections,
      newValue: null,
      editSummary: `Deleted collection "${tag.collections.tags.name ?? tag.name ?? tag.collections.tag_id}"`,
    })
  }

  await client.tags.delete({ where: { id: tagId } })

  await createEditHistoryEntry(client, {
    entityTable: 'tags',
    entityId: tag.id,
    previousValue: tag,
    newValue: null,
    editSummary: `Deleted tag "${tag.name}"`,
  })
}

/**
 * Returns all distinct documents associated with a collection through its tag.
 */
export async function getCollectionDocuments(collectionId: string): Promise<Document[]> {
  const result = await getDocumentsForCollection(collectionId, { page: 1, pageSize: 100 })
  return result.documents
}

interface CollectionDocumentQueryParams {
  search?: string
  sortField?: 'name' | 'id_legacy' | 'filesize' | 'created_at'
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

interface CollectionDocumentQueryResult {
  documents: Document[]
  total: number
}

export interface CreateCollectionInput {
  tagId?: string
  tagName?: string
  collectionNotes?: string
  tagNotes?: string
}

const COLLECTION_DOCUMENT_SORT_FIELDS = ['name', 'id_legacy', 'filesize', 'created_at'] as const

type CollectionDocumentSortField = (typeof COLLECTION_DOCUMENT_SORT_FIELDS)[number]

function normalizeCollectionDocumentPage(page?: number): number {
  return page && page > 0 ? Math.floor(page) : 1
}

function normalizeCollectionDocumentPageSize(pageSize?: number): number {
  if (!pageSize || pageSize < 1 || Number.isNaN(pageSize)) {
    return 25
  }
  return Math.min(Math.floor(pageSize), 100)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- normalizeCollectionDocumentSortField is kept for future use with server-side sorting
function normalizeCollectionDocumentSortField(_sortField?: string): CollectionDocumentSortField {
  return COLLECTION_DOCUMENT_SORT_FIELDS.includes(_sortField as CollectionDocumentSortField)
    ? (_sortField as CollectionDocumentSortField)
    : 'name'
}

function buildCollectionDocumentRowsSql(params: {
  collectionId: string
  search?: string
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  mode: 'in' | 'out'
}): Prisma.Sql {
  const page = normalizeCollectionDocumentPage(params.page)
  const pageSize = normalizeCollectionDocumentPageSize(params.pageSize)
  const offset = (page - 1) * pageSize
  const searchCondition = params.search?.trim()
    ? Prisma.sql`AND LOWER(COALESCE(d.name, '')) LIKE ${`%${params.search.trim().toLowerCase()}%`}`
    : Prisma.empty

  if (params.mode === 'in') {
    return Prisma.sql`
      WITH filtered AS (
        SELECT DISTINCT
          d.id,
          d.filesize,
          d.hash_binary,
          d.hash_content,
          d.id_legacy,
          NULL AS source_id,
          d.name,
          d.created_at,
          d.updated_at,
          0 AS is_duplicate
        FROM documents d
        INNER JOIN document_to_tags dtt ON dtt.document_id = d.id
        INNER JOIN collections c ON c.tag_id = dtt.tag_id
        WHERE c.id = ${params.collectionId}
        ${searchCondition}
      )
      SELECT f.*, totals.total
      FROM filtered f
      CROSS JOIN (SELECT COUNT(*) AS total FROM filtered) totals
      ORDER BY f.id ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `
  }

  return Prisma.sql`
    WITH filtered AS (
      SELECT DISTINCT
        d.id,
        d.filesize,
        d.hash_binary,
        d.hash_content,
        d.id_legacy,
        NULL AS source_id,
        d.name,
        d.created_at,
        d.updated_at,
        0 AS is_duplicate
      FROM documents d
      LEFT JOIN document_to_tags dtt ON dtt.document_id = d.id
        AND dtt.tag_id = (SELECT tag_id FROM collections WHERE id = ${params.collectionId})
      WHERE dtt.document_id IS NULL
      ${searchCondition}
    )
    SELECT f.*, totals.total
    FROM filtered f
    CROSS JOIN (SELECT COUNT(*) AS total FROM filtered) totals
    ORDER BY f.id ASC
    LIMIT ${pageSize} OFFSET ${offset}
  `
}

async function getCollectionDocumentsPage(
  params: {
    collectionId: string
    search?: string
    sortField?: string
    sortDirection?: 'asc' | 'desc'
    page?: number
    pageSize?: number
    mode: 'in' | 'out'
  },
): Promise<CollectionDocumentQueryResult> {
  const rows = await db.$queryRaw<Array<CollectionDocumentRow & { total: bigint | number | string }>>(
    buildCollectionDocumentRowsSql(params),
  )

  const total = rows.length > 0 ? Number(rows[0].total ?? 0) : 0
  return {
    documents: rows.map(({ total: _total, ...row }) => normalizeCollectionDocumentRow(row)),
    total,
  }
}

export async function getDocumentsForCollection(
  collectionId: string,
  params?: CollectionDocumentQueryParams,
): Promise<CollectionDocumentQueryResult> {
  return getCollectionDocumentsPage({ collectionId, mode: 'in', ...params })
}

export async function getDocumentsNotInCollection(
  collectionId: string,
  params?: CollectionDocumentQueryParams,
): Promise<CollectionDocumentQueryResult> {
  return getCollectionDocumentsPage({ collectionId, mode: 'out', ...params })
}

export async function addDocumentsToCollection(collectionId: string, documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) {
    return
  }

  const collection = await db.collections.findUnique({
    where: { id: collectionId },
    include: { tags: true },
  })

  if (!collection) {
    throw new Error('Collection not found')
  }

  const documentNames = await db.documents.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, name: true },
  })

  const nameMap = new Map(documentNames.map((d) => [d.id, d.name ?? 'Untitled']))

  const upsertResults = await db.$transaction(async (tx) => {
    return Promise.all(
      documentIds.map(async (documentId) =>
        tx.document_to_tags.upsert({
          where: {
            document_id_tag_id: {
              document_id: documentId,
              tag_id: collection.tag_id,
            },
          },
          update: {},
          create: {
            id: crypto.randomUUID(),
            document_id: documentId,
            tag_id: collection.tag_id,
          },
          select: { id: true, document_id: true, created_at: true },
        }),
      ),
    )
  })

  await db.$transaction(async (tx) => {
    await Promise.all(
      upsertResults.map((result) =>
        createEditHistoryEntry(tx, {
          entityTable: 'document_to_tags',
          entityId: result.id,
          previousValue: null,
          newValue: {
            id: result.id,
            document_id: result.document_id,
            tag_id: collection.tag_id,
            notes: null,
            created_at: result.created_at,
            tags: collection.tags,
            documents: {
              id: result.document_id,
              name: nameMap.get(result.document_id) ?? 'Untitled',
            },
          },
          editSummary: `Added document "${nameMap.get(result.document_id) ?? 'Untitled'}" to collection "${collection.tags?.name ?? collection.tag_id}"`,
        }),
      ),
    )
  })
}

export async function removeDocumentsFromCollection(collectionId: string, documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) {
    return
  }

  const collection = await db.collections.findUnique({
    where: { id: collectionId },
    include: { tags: true },
  })

  if (!collection) {
    throw new Error('Collection not found')
  }

  const rowsToDelete = await db.document_to_tags.findMany({
    where: {
      document_id: { in: documentIds },
      tag_id: collection.tag_id,
    },
    include: { documents: { select: { name: true } }, tags: true },
  })

  await db.$transaction(async (tx) => {
    await tx.document_to_tags.deleteMany({
      where: {
        document_id: { in: documentIds },
        tag_id: collection.tag_id,
      },
    })

    await Promise.all(
      rowsToDelete.map((row) =>
        createEditHistoryEntry(tx, {
          entityTable: 'document_to_tags',
          entityId: row.id,
          previousValue: {
            id: row.id,
            document_id: row.document_id,
            tag_id: row.tag_id,
            notes: row.notes,
            created_at: row.created_at,
            tags: row.tags,
            documents: {
              id: row.document_id,
              name: row.documents?.name ?? 'Untitled',
            },
          },
          newValue: null,
          editSummary: `Removed document "${row.documents?.name ?? 'Untitled'}" from collection "${collection.tags?.name ?? collection.tag_id}"`,
        }),
      ),
    )
  })
}

// ---------------------------------------------------------------------------
// getDocuments
// ---------------------------------------------------------------------------
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

async function getOverviewDocumentsPage(
  params: {
    page: number
    pageSize: number
    orderBy?: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
    sortDirection?: 'asc' | 'desc'
    search?: string
    statuses?: OverviewStatusOption[]
    documentType?: OverviewDocumentTypeOption
    batch?: string
    createdFrom?: string
    createdTo?: string
    collection?: string
    accessLevel?: OverviewAccessLevelOption
    cursor?: DocumentsCursor | null
    cursorDirection?: 'next' | 'prev'
  },
  client: QueryDbClient = db,
): Promise<DocumentsPageResult> {
  const sortField =
    params.orderBy && (DOCUMENTS_ORDERABLE_FIELDS as readonly string[]).includes(params.orderBy)
      ? params.orderBy
      : 'created_at'
  const sortDirection = params.sortDirection === 'asc' ? 'asc' : 'desc'
  const cursorDirection = params.cursorDirection === 'prev' ? 'prev' : 'next'
  const searchTerm = params.search?.trim()
  const sortExpression = Prisma.raw(OVERVIEW_SORT_EXPRESSIONS[sortField])
  const whereSql = buildOverviewDocumentsWhereSql({
    accessLevel: params.accessLevel,
    batch: params.batch,
    collection: params.collection,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    cursor: params.cursor,
    cursorDirection,
    documentType: params.documentType,
    searchTerm,
    sortDirection,
    sortExpression,
    sortField,
    statuses: params.statuses,
  })
  const orderBySql = buildOverviewDocumentsOrderBySql({
    cursorDirection,
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
  const startCursor = buildDocumentsCursor(orderedItems[0], sortField)
  const endCursor = buildDocumentsCursor(orderedItems.at(-1), sortField)

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

function buildOverviewDocumentsWhereSql(params: {
  searchTerm?: string
  statuses?: OverviewStatusOption[]
  documentType?: OverviewDocumentTypeOption
  batch?: string
  createdFrom?: string
  createdTo?: string
  collection?: string
  accessLevel?: OverviewAccessLevelOption
  cursor?: DocumentsCursor | null
  cursorDirection: 'next' | 'prev'
  sortDirection: 'asc' | 'desc'
  sortExpression: Prisma.Sql
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number]
}): Prisma.Sql {
  const conditions: Prisma.Sql[] = []

  if (params.searchTerm) {
    conditions.push(buildOverviewAuthorSearchConditionSql(params.searchTerm))
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

  if (params.batch) {
    conditions.push(buildOverviewBatchConditionSql(params.batch))
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

function buildOverviewStatusConditionSql(statuses: OverviewStatusOption[]): Prisma.Sql {
  const normalizedStatuses = Array.from(new Set(statuses.map((status) => status.toLowerCase())))
  return Prisma.sql`LOWER(COALESCE(dq.validation_status, '')) IN (${Prisma.join(normalizedStatuses)})`
}

function buildOverviewAuthorSearchConditionSql(searchTerm: string): Prisma.Sql {
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
          REPLACE(LOWER(a.name COLLATE utf8mb4_unicode_ci), ' ', ''),
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
      FROM document_to_authors dta
      INNER JOIN authors a ON a.id = dta.author_id
      WHERE dta.document_id = d.id
        AND (${Prisma.join(tokenConditions, ' OR ')})
    )
  `
}

function buildOverviewBatchConditionSql(batchTerm: string): Prisma.Sql {
  const likeValue = `%${batchTerm.toLowerCase()}%`

  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM document_to_batches dtb
      INNER JOIN batches b ON b.id = dtb.batch_id
      WHERE dtb.document_id = d.id
        AND LOWER(COALESCE(b.name, '')) LIKE ${likeValue}
    )
  `
}

function buildOverviewCollectionConditionSql(collection: string): Prisma.Sql {
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

function buildOverviewDocumentsCursorConditionSql(params: {
  cursor: DocumentsCursor
  cursorDirection: 'next' | 'prev'
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

function buildOverviewDocumentsOrderBySql(params: {
  cursorDirection: 'next' | 'prev'
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

  return Prisma.sql`
    ORDER BY ${params.sortExpression} ${Prisma.raw(primaryDirection)}, d.id ${Prisma.raw(secondaryDirection)}
  `
}

function buildDocumentsCursor(
  row: OverviewDocumentRow | undefined,
  sortField: (typeof DOCUMENTS_ORDERABLE_FIELDS)[number],
): DocumentsCursor | null {
  if (!row) {
    return null
  }
  return {
    id: String(row.id),
    value: serializeDocumentsCursorValue(sortField, row.sort_value),
  }
}

function serializeDocumentsCursorValue(
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

function coerceDocumentsCursorValue(
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

function normalizeOverviewDocumentRow(row: OverviewDocumentRow): Document {
  return {
    id: String(row.id),
    filesize: row.filesize !== null && row.filesize !== undefined ? Number(row.filesize) : null,
    hash_binary: row.hash_binary ?? null,
    hash_content: row.hash_content ?? null,
    id_legacy: row.id_legacy ?? null,
    source_id: row.source_id ?? null,
    name: row.name ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    is_duplicate: Boolean(Number(row.is_duplicate ?? 0)),
  }
}

function normalizeCollectionDocumentRow(row: CollectionDocumentRow): Document {
  return {
    id: String(row.id),
    filesize: row.filesize !== null && row.filesize !== undefined ? Number(row.filesize) : null,
    hash_binary: row.hash_binary ?? null,
    hash_content: row.hash_content ?? null,
    id_legacy: row.id_legacy ?? null,
    source_id: row.source_id ?? null,
    name: row.name ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    is_duplicate: Boolean(Number(row.is_duplicate ?? 0)),
  }
}

// ---------------------------------------------------------------------------
// getDocumentDetail
// Returns a document with its document_quality and document_versions.
// Metadata, audits, and reviews are empty stubs because those tables do not exist.
// ---------------------------------------------------------------------------
export async function getDocumentDetail(documentId: string): Promise<DocumentDetail | null> {
  const document = await db.documents.findUnique({
    where: { id: documentId },
  })

  if (!document) {
    return null
  }

  const [quality, versions, metadata, batches, authors, tags, canonicalGroup, variantMemberships] = await Promise.all([
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
      include: { batches: true },
    }),
    db.document_to_authors.findMany({
      where: { document_id: documentId },
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
            document_to_tags: {
              include: { tags: true },
            },
          },
        },
        document_versions: {
          include: {
            documents: {
              include: {
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
                document_to_tags: {
                  include: { tags: true },
                },
              },
            },
            document_versions: {
              include: {
                documents: {
                  include: {
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
  ])

  const mapQuality = (row: typeof quality): DocumentQuality | null => {
    if (!row) return null
    return {
      id: String(row.id),
      document_id: String(row.document_id),
      comment: row.comment ?? null,
      comment_additional: row.comment_additional ?? null,
      metadata_sufficiency: row.metadata_sufficiency ?? null,
      validation_status: row.validation_status ?? null,
      validation_type: row.validation_type ?? null,
      validation_timestamp:
        row.validation_timestamp !== null && row.validation_timestamp !== undefined
          ? Number(row.validation_timestamp)
          : null,
      validator_name: row.validator_name ?? null,
      validator_email: row.validator_email ?? null,
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
      id_legacy: string
      name: string | null
      created_at: Date | null
      updated_at: Date | null
      document_to_tags: Array<{ tags: { name: string } }>
    },
    isCanonical: boolean,
  ): VersionFamilyDocument => ({
    id: String(row.id),
    filesize: row.filesize !== null && row.filesize !== undefined ? Number(row.filesize) : null,
    hash_binary: row.hash_binary ?? null,
    hash_content: row.hash_content ?? null,
    id_legacy: row.id_legacy ?? null,
    name: row.name ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    is_canonical: isCanonical,
    is_duplicate: row.document_to_tags.some((tagLink) => tagLink.tags.name === 'duplicate_document'),
  })

  const mapVersionFamily = (): VersionFamily | null => {
    const group = canonicalGroup ?? variantMemberships[0]?.version_groups ?? null
    if (!group || group.document_versions.length === 0) {
      return null
    }

    const familyDocuments: VersionFamilyDocument[] = [
      mapVersionFamilyDocument(group.documents, true),
      ...group.document_versions.map((versionRow) => mapVersionFamilyDocument(versionRow.documents, false)),
    ]

    return {
      version_group_id: String(group.id),
      canonical_document_id: String(group.canonical_document_id),
      documents: familyDocuments,
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
      created_at: document.created_at ?? null,
      updated_at: document.updated_at ?? null,
      is_duplicate: hasDuplicateTag,
    },
    quality: mapQuality(quality),
    versions: versions.map((v) => ({
      id: String(v.id),
      document_id: String(v.document_id),
      version_group_id: String(v.version_group_id),
      notes: v.notes ?? null,
      changes_summary: v.changes_summary ?? null,
      created_at: v.created_at ?? null,
      updated_at: v.updated_at ?? null,
      analyzed_at: v.analyzed_at !== null && v.analyzed_at !== undefined ? Number(v.analyzed_at) : null,
    })),
    version_family: mapVersionFamily(),
    metadata: metadata.map((m) => ({
      name: m.metadata.name,
      value: String(m.value ?? ''),
      value_type: m.value_type ?? null,
    })),
    document_to_batches: batches.map((b) => ({
      id: String(b.id),
      document_id: String(b.document_id),
      batch_id: String(b.batch_id),
      added_at: b.added_at ?? null,
      batch_origin: b.batch_origin ?? null,
      cost: b.cost !== null ? String(b.cost) : null,
      processing_time_seconds: b.processing_time_seconds ?? null,
      ocr_quality_low: b.ocr_quality_low ?? null,
      ocr_quality_medium: b.ocr_quality_medium ?? null,
      batch_legacy_id: b.batches.id_legacy ?? null,
      batch_name: b.batches.name ?? null,
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
  }
}

// ---------------------------------------------------------------------------
// getBatchSummary
// Returns an empty array.  The documents table has no `state` column, so
// there is no reliable way to determine which documents have failed.
// ---------------------------------------------------------------------------
export async function getFailures(): Promise<FailureItem[]> {
  // documents table has no state column — cannot determine failures
  return await Promise.resolve([])
}

export async function getOverviewFilterOptions(): Promise<OverviewFilterOptions> {
  const collections = await getDistinctCollectionTags()

  return {
    collections: collections.filter((collection) => collection !== 'duplicate_document'),
    accessLevels: [...OVERVIEW_ACCESS_LEVEL_OPTIONS],
  }
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
  })

  const tagSet = new Set<string>()
  for (const tag of rows) {
    if (tag.document_to_tags.length > 0) {
      tagSet.add(tag.name)
    }
  }
  return Array.from(tagSet).sort()
}

// ---------------------------------------------------------------------------
// updateDocumentCollectionTags
// Returns false.  The documents table has no `collection_tags` column,
// so this operation cannot be performed.
// ---------------------------------------------------------------------------
export async function updateDocumentCollectionTags(_documentId: string, _collectionTags: string[]): Promise<boolean> {
  // documents table has no collection_tags column — operation not supported
  return await Promise.resolve(false)
}

// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// getReviewQueueDocuments
// Returns documents with validation_status IN ('IN_PROGRESS', 'NEEDS_REVISION')
// OR documents that have a 'needs_review' metadata flag OR 'sensitive' metadata TRUE.
// ---------------------------------------------------------------------------
export async function getReviewQueueDocuments(): Promise<{
  items: ReviewQueueItem[]
  total: number
}> {
  // Find metadata ids for 'needs_review' and 'sensitive'
  const [needsReviewMeta, sensitiveMeta] = await Promise.all([
    db.metadata.findFirst({ where: { name: 'needs_review' } }),
    db.metadata.findFirst({ where: { name: 'sensitive' } }),
  ])

  const needsReviewMetaId = needsReviewMeta?.id
  const sensitiveMetaId = sensitiveMeta?.id

  // Get documents with IN_PROGRESS or NEEDS_REVISION validation_status.
  // Use raw SQL because the generated Prisma enum does not include these legacy values.
  const qualityDocs = await db.$queryRaw<Array<{ document_id: string }>>(Prisma.sql`
    SELECT document_id
    FROM document_quality
    WHERE validation_status IN ('IN_PROGRESS', 'NEEDS_REVISION')
  `)

  const qualityDocIds = new Set(qualityDocs.map((d) => d.document_id))

  // Get documents with needs_review or sensitive metadata
  const metadataFilters: { metadata_id: string; value: { notIn: string[] } }[] = []
  if (needsReviewMetaId) {
    metadataFilters.push({ metadata_id: needsReviewMetaId, value: { notIn: ['', 'false', '0', 'no'] } })
  }
  if (sensitiveMetaId) {
    metadataFilters.push({ metadata_id: sensitiveMetaId, value: { notIn: ['', 'false', '0', 'no'] } })
  }

  let metadataDocIds = new Set<string>()
  if (metadataFilters.length > 0) {
    const metadataRows = await db.document_to_metadata.findMany({
      where: {
        OR: metadataFilters,
      },
      select: { document_id: true },
    })
    metadataDocIds = new Set(metadataRows.map((r) => r.document_id))
  }

  // Union of quality doc IDs and metadata doc IDs
  const allDocIds = new Set([...qualityDocIds, ...metadataDocIds])

  if (allDocIds.size === 0) {
    return { items: [], total: 0 }
  }

  const documents = await db.documents.findMany({
    where: { id: { in: [...allDocIds] } },
    include: { document_quality: true, document_to_metadata: true },
  })

  const items: ReviewQueueItem[] = documents.map((doc) => {
    const q = doc.document_quality
    // Determine needs_review and sensitive from metadata
    const needsReview = doc.document_to_metadata.some(
      (m) => m.metadata_id === needsReviewMetaId && m.value && !['', 'false', '0', 'no'].includes(m.value),
    )
    const sensitive = doc.document_to_metadata.some(
      (m) => m.metadata_id === sensitiveMetaId && m.value && !['', 'false', '0', 'no'].includes(m.value),
    )
    return {
      id: String(doc.id),
      name: doc.name ?? null,
      validation_status: q?.validation_status ?? null,
      validation_type: q?.validation_type ?? null,
      validator_name: q?.validator_name ?? null,
      validator_email: q?.validator_email ?? null,
      needs_review: needsReview,
      sensitive,
    }
  })

  return { items, total: items.length }
}

// ---------------------------------------------------------------------------
// getReadyForLibraryDocuments
// Returns documents with validation_status = 'APPROVED', has access_level via document_access,
// and required Dublin Core metadata fields present.
// ---------------------------------------------------------------------------
export async function getReadyForLibraryDocuments(): Promise<{
  items: ReadyForLibraryItem[]
  total: number
}> {
  const requiredDcFields = ['dc_title', 'dc_type', 'dc_subject', 'dc_rights']

  const dcMetadata = await db.metadata.findMany({
    where: { name: { in: requiredDcFields } },
    select: { id: true, name: true },
  })

  const dcMetaMap = new Map(dcMetadata.map((m) => [m.id, m.name]))
  const dcMetaIds = new Set(dcMetadata.map((m) => m.id))

  const qualityDocs = await db.document_quality.findMany({
    where: {
      validation_status: 'APPROVED',
    },
    select: { document_id: true, validation_status: true, validation_timestamp: true },
  })

  if (qualityDocs.length === 0) {
    return { items: [], total: 0 }
  }

  const approvedDocIds = [...new Set(qualityDocs.map((d) => d.document_id))]

  // Get documents that have at least one access_level set via document_access
  const accessRows = await db.document_access.findMany({
    where: { document_id: { in: approvedDocIds } },
    select: { document_id: true, access_level_id: true, access_levels: { select: { level_name: true } } },
  })
  const docAccessMap = new Map<string, string>()
  for (const row of accessRows) {
    if (!docAccessMap.has(row.document_id)) {
      docAccessMap.set(row.document_id, row.access_levels.level_name)
    }
  }

  const approvedWithAccess = approvedDocIds.filter((id) => docAccessMap.has(id))

  const metadataRows = await db.document_to_metadata.findMany({
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

  const items: ReadyForLibraryItem[] = []
  for (const qd of qualityDocs) {
    if (!docAccessMap.has(qd.document_id)) continue
    const dcFieldsPresent = docDcFields.get(qd.document_id)
    const metadata_complete = dcFieldsPresent !== undefined && requiredDcFields.every((f) => dcFieldsPresent.has(f))
    items.push({
      id: qd.document_id,
      name: null, // name loaded separately below if needed
      validation_status: qd.validation_status ?? null,
      validation_timestamp:
        qd.validation_timestamp !== null && qd.validation_timestamp !== undefined
          ? Number(qd.validation_timestamp)
          : null,
      metadata_complete,
      access_level: docAccessMap.get(qd.document_id) ?? null,
    })
  }

  // Hydrate names from documents table
  const docRows = await db.documents.findMany({
    where: { id: { in: approvedWithAccess } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(docRows.map((d) => [d.id, d.name ?? null]))

  for (const item of items) {
    item.name = nameMap.get(item.id) ?? null
  }

  return { items, total: items.length }
}

function parseBatchProcessingDetails(rawDetails: string | null): Record<string, string | number | boolean | null> {
  if (!rawDetails?.trim()) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(rawDetails)

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return {}
    }

    const normalizedEntries = Object.entries(parsed).map(([key, value]) => {
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return [key, value] as const
      }

      return [key, JSON.stringify(value)] as const
    })

    return Object.fromEntries(normalizedEntries)
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// getBatchSummary
// Returns processing details flattened into property rows per batch.
// ---------------------------------------------------------------------------
export async function getBatchSummary(): Promise<BatchSummary[]> {
  const rows = await db.batches.findMany({
    select: {
      id: true,
      id_legacy: true,
      name: true,
      processing_details: true,
      document_to_batches: {
        select: {
          processing_time_seconds: true,
        },
      },
    },
  })

  const result: BatchSummary[] = []

  for (const batch of rows) {
    const details = parseBatchProcessingDetails(batch.processing_details)

    for (const [property_key, property_value] of Object.entries(details)) {
      result.push({
        batch_id: batch.id,
        batch_name: batch.name ?? null,
        batch_id_legacy: batch.id_legacy ?? null,
        property_key,
        property_value,
      })
    }

    const totalProcessingTime = batch.document_to_batches.reduce(
      (sum, dtb) => sum + (dtb.processing_time_seconds ?? 0),
      0,
    )

    result.push({
      batch_id: batch.id,
      batch_name: batch.name ?? null,
      batch_id_legacy: batch.id_legacy ?? null,
      property_key: 'processing_time_seconds',
      property_value: totalProcessingTime,
    })
  }

  return result
}
