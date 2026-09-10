import { db } from '@lib/db'
import { createEditHistoryEntry, markDocumentBatchesPublicationLocked } from '@lib/editHistory'
import { buildNameHash } from '@lib/tagHash'
import { resolveBatchSearchIds, resolveTagSearchIds } from '@lib/queries/searchResolvers'
import {
  buildOverviewAuthorSearchConditionSql,
  buildOverviewBatchConditionSql,
  buildOverviewStatusConditionSql,
  buildOverviewTagConditionSql,
  type QueryDbClient,
} from '@lib/queries/documentQuerySupport'
import { Prisma, PrismaClient } from '@lib/prisma/generated/client'
import { getProtectedTagDeletionMessage, isProtectedTagName, normalizeTagName } from '@lib/tagUtils'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeStatuses,
  normalizeTextFilter,
  type AdvancedSearchFilters,
  type AccessLevelOption,
  type DocumentTypeOption,
  type StatusOption,
} from '@lib/search'
import type { CollectionWithMeta } from 'types/collections'
import type { Document } from 'types/documents'

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
    let tag = tagId ? await tx.tags.findUnique({ where: { id: tagId } }) : null

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

  if (isProtectedTagName(tag.name)) {
    throw new Error(getProtectedTagDeletionMessage(tag.name))
  }

  if (deleteAssociations) {
    await deleteTagAndDocumentAssociationsInTransaction(client, tagId)
    return
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

  if (isProtectedTagName(tag.name)) {
    throw new Error(getProtectedTagDeletionMessage(tag.name))
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

export interface CollectionDocumentQueryParams extends AdvancedSearchFilters {
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

function normalizeCollectionDocumentSortField(sortField?: string): CollectionDocumentSortField {
  return COLLECTION_DOCUMENT_SORT_FIELDS.includes(sortField as CollectionDocumentSortField)
    ? (sortField as CollectionDocumentSortField)
    : 'name'
}

interface CollectionDocumentSqlParams {
  collectionId: string
  search?: string
  author?: string
  tagIds?: string[]
  statuses?: StatusOption[]
  documentType?: DocumentTypeOption
  batchIds?: string[]
  createdFrom?: string
  createdTo?: string
  accessLevel?: AccessLevelOption
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  mode: 'in' | 'out'
}

function buildCollectionDocumentAdvancedFilterSql(params: CollectionDocumentSqlParams): Prisma.Sql {
  const filterConditions: Prisma.Sql[] = []

  if (params.author?.trim()) {
    filterConditions.push(buildOverviewAuthorSearchConditionSql(params.author))
  }

  if (params.tagIds) {
    filterConditions.push(buildOverviewTagConditionSql(params.tagIds))
  }

  if (params.statuses?.length) {
    filterConditions.push(buildOverviewStatusConditionSql(params.statuses))
  }

  if (params.documentType === 'unique' || params.documentType === 'duplicate') {
    const duplicateCondition = Prisma.sql`
      EXISTS (
        SELECT 1 FROM document_to_tags duplicate_dtt
        INNER JOIN tags duplicate_tag ON duplicate_tag.id = duplicate_dtt.tag_id
        WHERE duplicate_dtt.document_id = d.id
          AND duplicate_tag.name = 'duplicate_document'
      )
    `
    filterConditions.push(
      params.documentType === 'duplicate' ? duplicateCondition : Prisma.sql`NOT ${duplicateCondition}`,
    )
  }

  if (params.batchIds) {
    filterConditions.push(buildOverviewBatchConditionSql(params.batchIds))
  }

  if (params.createdFrom) {
    filterConditions.push(Prisma.sql`d.created_at >= ${new Date(`${params.createdFrom}T00:00:00.000Z`)}`)
  }

  if (params.createdTo) {
    filterConditions.push(Prisma.sql`d.created_at <= ${new Date(`${params.createdTo}T23:59:59.999Z`)}`)
  }

  if (params.accessLevel) {
    filterConditions.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM document_access filtered_da
        INNER JOIN access_levels filtered_al ON filtered_al.id = filtered_da.access_level_id
        WHERE filtered_da.document_id = d.id
          AND LOWER(filtered_al.level_name) = ${params.accessLevel.toLowerCase()}
      )
    `)
  }

  return filterConditions.length ? Prisma.sql`AND ${Prisma.join(filterConditions, ' AND ')}` : Prisma.empty
}

function buildCollectionDocumentRowsSql(params: CollectionDocumentSqlParams): Prisma.Sql {
  const page = normalizeCollectionDocumentPage(params.page)
  const pageSize = normalizeCollectionDocumentPageSize(params.pageSize)
  const offset = (page - 1) * pageSize
  const sortField = normalizeCollectionDocumentSortField(params.sortField)
  const sortDirection = params.sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`
  const sortExpression =
    sortField === 'filesize'
      ? Prisma.sql`f.filesize`
      : sortField === 'id_legacy'
        ? Prisma.sql`f.id_legacy`
        : sortField === 'created_at'
          ? Prisma.sql`f.created_at`
          : Prisma.sql`f.name`
  const searchCondition = params.search?.trim()
    ? Prisma.sql`
        AND (
          LOWER(COALESCE(d.name, '')) LIKE ${`%${params.search.trim().toLowerCase()}%`}
          OR LOWER(COALESCE(d.id_legacy, '')) LIKE ${`%${params.search.trim().toLowerCase()}%`}
        )
      `
    : Prisma.empty
  const advancedFilterCondition = buildCollectionDocumentAdvancedFilterSql(params)

  if (params.mode === 'in') {
    return Prisma.sql`
      WITH filtered AS (
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
          d.created_at,
          d.updated_at,
          0 AS is_duplicate
        FROM documents d
        INNER JOIN document_to_tags dtt ON dtt.document_id = d.id
        INNER JOIN collections c ON c.tag_id = dtt.tag_id
        LEFT JOIN (
          SELECT dtm.document_id, dtm.value
          FROM document_to_metadata dtm
          INNER JOIN metadata m ON m.id = dtm.metadata_id
          WHERE m.name = 'source_id'
        ) AS source_meta ON source_meta.document_id = d.id
        LEFT JOIN document_quality dq ON dq.document_id = d.id
        WHERE c.id = ${params.collectionId}
        ${searchCondition}
        ${advancedFilterCondition}
      )
      SELECT f.*, totals.total
      FROM filtered f
      CROSS JOIN (SELECT COUNT(*) AS total FROM filtered) totals
      ORDER BY ${sortExpression} ${sortDirection}, f.id ASC
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
      LEFT JOIN document_quality dq ON dq.document_id = d.id
      WHERE dtt.document_id IS NULL
      ${searchCondition}
      ${advancedFilterCondition}
    )
    SELECT f.*, totals.total
    FROM filtered f
    CROSS JOIN (SELECT COUNT(*) AS total FROM filtered) totals
    ORDER BY ${sortExpression} ${sortDirection}, f.id ASC
    LIMIT ${pageSize} OFFSET ${offset}
  `
}

async function getCollectionDocumentsPage(
  params: CollectionDocumentSqlParams,
  client: QueryDbClient = db,
): Promise<CollectionDocumentQueryResult> {
  const rows = await client.$queryRaw<Array<CollectionDocumentRow & { total: bigint | number | string }>>(
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
  client: QueryDbClient = db,
): Promise<CollectionDocumentQueryResult> {
  return getCollectionDocumentsPage(
    {
      collectionId,
      mode: 'in',
      ...params,
      author: normalizeTextFilter(params?.author),
      tagIds: await resolveTagSearchIds(normalizeTextFilter(params?.tag), client),
      statuses: normalizeStatuses(params?.statuses),
      documentType: normalizeDocumentType(params?.documentType),
      batchIds: await resolveBatchSearchIds(normalizeTextFilter(params?.batch), client),
      createdFrom: normalizeDateFilter(params?.createdFrom),
      createdTo: normalizeDateFilter(params?.createdTo),
      accessLevel: normalizeAccessLevel(params?.accessLevel),
    },
    client,
  )
}

export async function getDocumentsNotInCollection(
  collectionId: string,
  params?: CollectionDocumentQueryParams,
  client: QueryDbClient = db,
): Promise<CollectionDocumentQueryResult> {
  return getCollectionDocumentsPage(
    {
      collectionId,
      mode: 'out',
      ...params,
      author: normalizeTextFilter(params?.author),
      tagIds: await resolveTagSearchIds(normalizeTextFilter(params?.tag), client),
      statuses: normalizeStatuses(params?.statuses),
      documentType: normalizeDocumentType(params?.documentType),
      batchIds: await resolveBatchSearchIds(normalizeTextFilter(params?.batch), client),
      createdFrom: normalizeDateFilter(params?.createdFrom),
      createdTo: normalizeDateFilter(params?.createdTo),
      accessLevel: normalizeAccessLevel(params?.accessLevel),
    },
    client,
  )
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
    await Promise.all(upsertResults.map((result) => markDocumentBatchesPublicationLocked(tx, result.document_id)))
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
    await Promise.all(rowsToDelete.map((row) => markDocumentBatchesPublicationLocked(tx, row.document_id)))
  })
}
// updateDocumentCollectionTags
// Returns false.  The documents table has no `collection_tags` column,
// so this operation cannot be performed.
// ---------------------------------------------------------------------------
export async function updateDocumentCollectionTags(_documentId: string, _collectionTags: string[]): Promise<boolean> {
  // documents table has no collection_tags column — operation not supported
  return await Promise.resolve(false)
}
