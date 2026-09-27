import { db } from '@lib/db'
import { createEditHistoryEntry, markDocumentBatchesPublicationLocked } from '@lib/editHistory'
import { buildNameHash } from '@lib/tagHash'
import { refreshDocumentReadinessInTransaction } from '@lib/pipelineReadiness'
import {
  getCollectionMemberDocumentCounts,
  getCollectionMembershipIndex,
  getCollectionMemberDocumentIds,
  type CollectionMembershipDataClient,
  type CollectionMembershipIndexOptions,
} from '@lib/queries/collectionMembershipQueries'
import { resolveBatchSearchIds, resolveTagSearchIds } from '@lib/queries/searchResolvers'
import {
  buildOverviewContributorSearchConditionSql,
  buildOverviewPublisherSearchConditionSql,
  buildOverviewBatchConditionSql,
  buildOverviewStatusConditionSql,
  buildOverviewTagConditionSql,
  getOverviewDocumentsPage,
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
import type {
  CollectionListPageResult,
  CollectionTableQuery,
  CollectionWithMeta,
} from 'types/collections'
import type { Document } from 'types/documents'

const DEFAULT_COLLECTION_PAGE_SIZE = 25
const SUPPORTED_COLLECTION_PAGE_SIZES = [25, 50, 100, 250, 500] as const

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function normalizeCollectionPageSize(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_COLLECTION_PAGE_SIZE
  }

  let resolved = DEFAULT_COLLECTION_PAGE_SIZE
  for (const supportedPageSize of SUPPORTED_COLLECTION_PAGE_SIZES) {
    if (value < supportedPageSize) {
      break
    }

    resolved = supportedPageSize
  }

  return resolved
}

export function parseCollectionQueryParams(
  params: Record<string, string | string[] | undefined>,
): CollectionTableQuery {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const sortDirection = firstSearchParam(params.sortDirection)
  const cursorDirection = firstSearchParam(params.cursorDirection)

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: normalizeCollectionPageSize(pageSize),
    search: normalizeTextFilter(firstSearchParam(params.search)),
    orderBy: normalizeTextFilter(firstSearchParam(params.orderBy)),
    sortDirection: sortDirection === 'asc' || sortDirection === 'desc' ? sortDirection : undefined,
    cursorValue: normalizeTextFilter(firstSearchParam(params.cursorValue)),
    cursorId: normalizeTextFilter(firstSearchParam(params.cursorId)),
    cursorDirection: cursorDirection === 'next' || cursorDirection === 'prev' ? cursorDirection : undefined,
    filters: {
      contributor: normalizeTextFilter(firstSearchParam(params.contributor)),
      publisher: normalizeTextFilter(firstSearchParam(params.publisher)),
      tag: normalizeTextFilter(firstSearchParam(params.tag)),
      statuses: normalizeStatuses(firstSearchParam(params.statuses)?.split(',')),
      documentType: normalizeDocumentType(firstSearchParam(params.documentType)),
      batch: normalizeTextFilter(firstSearchParam(params.batch)),
      createdFrom: normalizeDateFilter(firstSearchParam(params.createdFrom)),
      createdTo: normalizeDateFilter(firstSearchParam(params.createdTo)),
      collection: normalizeTextFilter(firstSearchParam(params.collection)),
      accessLevel: normalizeAccessLevel(firstSearchParam(params.accessLevel)),
    },
  }
}

function hasCollectionDocumentFilters(filters: AdvancedSearchFilters): boolean {
  return Boolean(
    filters.contributor?.trim() ||
      filters.publisher?.trim() ||
      filters.tag?.trim() ||
      filters.statuses?.length ||
      (filters.documentType && filters.documentType !== 'all') ||
      filters.batch?.trim() ||
      filters.createdFrom ||
      filters.createdTo ||
      filters.collection?.trim() ||
      filters.accessLevel,
  )
}

async function filterCollectionsByDocumentCriteria(
  collections: CollectionWithMeta[],
  filters: AdvancedSearchFilters,
  client: QueryDbClient,
  documentIdsByCollection: Map<string, string[]>,
): Promise<CollectionWithMeta[]> {
  if (!hasCollectionDocumentFilters(filters)) {
    return collections
  }

  const candidateDocumentIds = [...new Set([...documentIdsByCollection.values()].flat())]
  if (candidateDocumentIds.length === 0) {
    return []
  }

  const [tagIds, batchIds] = await Promise.all([
    resolveTagSearchIds(normalizeTextFilter(filters.tag), client),
    resolveBatchSearchIds(normalizeTextFilter(filters.batch), client),
  ])
  const matchingDocuments = await getOverviewDocumentsPage(
    {
      page: 1,
      pageSize: candidateDocumentIds.length,
      contributor: normalizeTextFilter(filters.contributor),
      publisher: normalizeTextFilter(filters.publisher),
      tagIds,
      statuses: normalizeStatuses(filters.statuses),
      documentType: normalizeDocumentType(filters.documentType),
      batchIds,
      createdFrom: normalizeDateFilter(filters.createdFrom),
      createdTo: normalizeDateFilter(filters.createdTo),
      accessLevel: normalizeAccessLevel(filters.accessLevel),
      documentIds: candidateDocumentIds,
    },
    client,
  )
  const matchingDocumentIds = new Set(matchingDocuments.data.map((document) => document.id))

  return collections.filter((collection) =>
    documentIdsByCollection.get(collection.id)?.some((documentId) => matchingDocumentIds.has(documentId)),
  )
}

function compareCollectionValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  return String(left).localeCompare(String(right))
}

function getCollectionSortValue(collection: CollectionWithMeta, orderBy?: string): string | number {
  switch (orderBy) {
    case 'document_count':
      return collection.document_count
    case 'fedora_node_id':
      return collection.fedora_node_id ?? ''
    case 'collection_name':
    case 'name':
    default:
      return collection.collection_name
  }
}

function sortCollectionItems(
  collections: CollectionWithMeta[],
  orderBy?: string,
  sortDirection: 'asc' | 'desc' = 'asc',
): CollectionWithMeta[] {
  const multiplier = sortDirection === 'desc' ? -1 : 1

  return [...collections].sort((left, right) => {
    const valueComparison = compareCollectionValues(
      getCollectionSortValue(left, orderBy),
      getCollectionSortValue(right, orderBy),
    )
    return valueComparison === 0 ? left.id.localeCompare(right.id) : valueComparison * multiplier
  })
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
export async function getCollections(
  client: QueryDbClient = db,
  precomputedMemberCounts?: Map<string, number>,
): Promise<CollectionWithMeta[]> {
  const [memberCounts, collections] = await Promise.all([
    precomputedMemberCounts ?? getCollectionMemberDocumentCounts(client as unknown as CollectionMembershipDataClient),
    client.collections.findMany({
      include: {
        tags: { select: { id: true, name: true } },
        collection_qualifiers: {
          include: { tags: { select: { id: true, name: true } } },
        },
      },
    }),
  ])

  return collections
    .map((collection) => {
      const canonicalTagName = collection.tags.name ?? 'Untitled collection'
      return {
        id: collection.id,
        tag_id: collection.tag_id,
        collection_name: canonicalTagName,
        canonical_tag: { id: collection.tags.id, name: canonicalTagName },
        qualifiers: collection.collection_qualifiers.flatMap((qualifier) =>
          qualifier.tags.name ? [{ id: qualifier.tags.id, name: qualifier.tags.name }] : [],
        ),
        fedora_node_id: collection.fedora_node_id,
        notes: collection.notes ?? null,
        created_at: collection.created_at ?? null,
        updated_at: collection.updated_at ?? null,
        document_count: memberCounts.get(collection.id) ?? 0,
      }
    })
    .sort((left, right) => left.collection_name.localeCompare(right.collection_name))
}

export async function getCollectionPage(
  query: CollectionTableQuery,
  client: QueryDbClient = db,
): Promise<CollectionListPageResult> {
  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1
  const pageSize = normalizeCollectionPageSize(query.pageSize)
  const normalizedSearch = normalizeTextFilter(query.search)?.toLocaleLowerCase()
  const filters = query.filters ?? {}
  const collectionMembershipOptions: CollectionMembershipIndexOptions = {}
  if (filters.collection?.trim()) {
    const collectionRows = await client.collections.findMany({
      select: { id: true, tags: { select: { name: true } } },
    })
    const normalizedCollection = filters.collection.trim().toLocaleLowerCase()
    collectionMembershipOptions.collectionIds = collectionRows
      .filter((row) => row.tags.name?.trim().toLocaleLowerCase() === normalizedCollection)
      .map((row) => row.id)
  }
  const membershipIndex = hasCollectionDocumentFilters(filters)
    ? await getCollectionMembershipIndex(client as unknown as CollectionMembershipDataClient, collectionMembershipOptions)
    : undefined
  const allCollections = await getCollections(client, membershipIndex?.counts)
  const documentFilteredCollections = membershipIndex
    ? await filterCollectionsByDocumentCriteria(allCollections, filters, client, membershipIndex.documentIdsByCollection)
    : allCollections
  const filteredCollections = normalizedSearch
    ? documentFilteredCollections.filter((collection) => {
        const collectionName = collection.collection_name.toLocaleLowerCase()
        const fedoraNodeId = collection.fedora_node_id?.toLocaleLowerCase() ?? ''
        return collectionName.includes(normalizedSearch) || fedoraNodeId.includes(normalizedSearch)
      })
    : documentFilteredCollections
  const sortedCollections = sortCollectionItems(filteredCollections, query.orderBy, query.sortDirection ?? 'asc')
  const offset = (page - 1) * pageSize
  const data = sortedCollections.slice(offset, offset + pageSize)

  return {
    data,
    totalCount: sortedCollections.length,
    pageInfo: {
      pageSize,
      hasNextPage: offset + data.length < sortedCollections.length,
      hasPreviousPage: page > 1,
      startCursor: null,
      endCursor: null,
    },
  }
}

export async function createCollection(
  input: CreateCollectionInput,
): Promise<{ collection: CollectionWithMeta; createdTag: boolean }> {
  return db.$transaction(async (tx) => createCollectionInTransaction(tx, input))
}

// The transaction intentionally coordinates canonical-tag selection, qualifier creation, and audit records.
// eslint-disable-next-line complexity
export async function createCollectionInTransaction(
  client: Prisma.TransactionClient | PrismaClient,
  input: CreateCollectionInput,
): Promise<{ collection: CollectionWithMeta; createdTag: boolean }> {
  const tagId = input.tagId?.trim() ?? ''
  const tagName = normalizeTagName(input.tagName ?? '')
  const collectionNotes = input.collectionNotes?.trim() ?? ''
  const tagNotes = input.tagNotes?.trim() ?? ''
  const fedoraNodeId = input.fedoraNodeId?.trim() || null

  if (!tagId && !tagName) {
    throw new Error('Select an existing tag or enter a new tag name.')
  }

  let createdTag = false
  let tag = tagId ? await client.tags.findUnique({ where: { id: tagId } }) : null

  if (!tagId && tagName) {
    const nameHash = buildNameHash(tagName)
    const matchingTag = await client.tags.findFirst({
      where: {
        OR: [{ name_hash: nameHash }, { name: tagName }],
      },
    })
    tag = matchingTag

    if (!tag) {
      const newTag = await client.tags.create({
        data: {
          id: crypto.randomUUID(),
          name: tagName,
          notes: tagNotes || null,
        },
      })
      // The transaction owns this local value; no concurrent mutation shares the variable.
      // eslint-disable-next-line require-atomic-updates
      tag = newTag

      await createEditHistoryEntry(client, {
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

  const existingCollection = await client.collections.findUnique({
    where: { tag_id: tag.id },
    include: { tags: true },
  })

  if (existingCollection) {
    throw new Error(`A collection for "${existingCollection.tags.name ?? 'this tag'}" already exists.`)
  }

  const qualifierTagIds = [...new Set((input.qualifierTagIds ?? []).map((id) => id.trim()).filter(Boolean))]
  const existingQualifierTags = await client.tags.findMany({
    where: { id: { in: qualifierTagIds } },
    select: { id: true, name: true },
  })
  if (existingQualifierTags.length !== qualifierTagIds.length) {
    throw new Error('One or more qualifier tags could not be found.')
  }
  const qualifierTagNames = [
    ...new Set((input.qualifierTagNames ?? []).map((name) => normalizeTagName(name)).filter(Boolean)),
  ]
  const namedQualifierTags = await Promise.all(
    qualifierTagNames.map((name) => findOrCreateCollectionTag(client, name)),
  )
  const qualifierTags = [
    ...new Map([...existingQualifierTags, ...namedQualifierTags].map((qualifier) => [qualifier.id, qualifier])).values(),
  ]
  if (qualifierTags.some((qualifier) => qualifier.id === tag.id)) {
    throw new Error('The canonical tag is already a required collection qualifier.')
  }

  const createdCollection = await client.collections.create({
    data: {
      id: crypto.randomUUID(),
      tag_id: tag.id,
      notes: collectionNotes || null,
      fedora_node_id: fedoraNodeId,
    },
    include: { tags: true },
  })
  const createdQualifiers = await Promise.all(
    qualifierTags.map(async (qualifierTag) => {
      const qualifier = await client.collection_qualifiers.create({
        data: { id: crypto.randomUUID(), collection_id: createdCollection.id, tag_id: qualifierTag.id },
      })
      await createEditHistoryEntry(client, {
        entityTable: 'collection_qualifiers',
        entityId: qualifier.id,
        previousValue: null,
        newValue: { ...qualifier, tags: qualifierTag },
        editSummary: `Added qualifier "${qualifierTag.name ?? qualifierTag.id}" to collection "${createdCollection.tags.name ?? tag.id}"`,
      })
      return qualifierTag
    }),
  )

  await createEditHistoryEntry(client, {
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
      canonical_tag: { id: createdCollection.tags.id, name: createdCollection.tags.name ?? tag.id },
      qualifiers: createdQualifiers.flatMap((qualifier) =>
        qualifier.name ? [{ id: qualifier.id, name: qualifier.name }] : [],
      ),
      fedora_node_id: createdCollection.fedora_node_id,
      notes: createdCollection.notes ?? null,
      created_at: createdCollection.created_at ?? null,
      updated_at: createdCollection.updated_at ?? null,
      document_count: 0,
    },
    createdTag,
  }
}

export async function updateCollection(input: UpdateCollectionInput): Promise<void> {
  await db.$transaction(async (tx) => {
    await updateCollectionInTransaction(tx, input)
  })
}

export async function updateCollectionInTransaction(
  client: Prisma.TransactionClient | PrismaClient,
  input: UpdateCollectionInput,
): Promise<void> {
  const collectionId = input.collectionId.trim()
  if (!collectionId) {
    throw new Error('Collection id is required.')
  }

  const collection = await client.collections.findUnique({
    where: { id: collectionId },
    include: {
      tags: true,
      collection_qualifiers: { include: { tags: true } },
    },
  })
  if (!collection) {
    throw new Error('Collection not found.')
  }

  const qualifierTagIds = [...new Set(input.qualifierTagIds.map((tagId) => tagId.trim()).filter(Boolean))]
  const qualifierTags = await client.tags.findMany({
    where: { id: { in: qualifierTagIds } },
    select: { id: true, name: true, notes: true },
  })
  if (qualifierTags.length !== qualifierTagIds.length) {
    throw new Error('One or more qualifier tags could not be found.')
  }

  const qualifierTagNames = [
    ...new Set((input.qualifierTagNames ?? []).map((tagName) => normalizeTagName(tagName)).filter(Boolean)),
  ]
  const namedQualifierTags = await Promise.all(
    qualifierTagNames.map(async (tagName) => {
      const nameHash = buildNameHash(tagName)
      const existingTag = await client.tags.findFirst({
        where: { OR: [{ name_hash: nameHash }, { name: tagName }] },
      })
      if (existingTag) {
        return existingTag
      }

      const createdTag = await client.tags.create({
        data: { id: crypto.randomUUID(), name: tagName },
      })
      await createEditHistoryEntry(client, {
        entityTable: 'tags',
        entityId: createdTag.id,
        previousValue: null,
        newValue: createdTag,
        editSummary: `Created tag "${createdTag.name}"`,
      })
      return createdTag
    }),
  )
  const allQualifierTags = [
    ...new Map([...qualifierTags, ...namedQualifierTags].map((tag) => [tag.id, tag])).values(),
  ]
  if (allQualifierTags.some((tag) => tag.id === collection.tag_id)) {
    throw new Error('The canonical tag is already a required collection qualifier.')
  }

  const currentQualifiersByTagId = new Map(
    collection.collection_qualifiers.map((qualifier) => [qualifier.tag_id, qualifier]),
  )
  const qualifierTagsById = new Map(allQualifierTags.map((tag) => [tag.id, tag]))
  const qualifiersToRemove = collection.collection_qualifiers.filter(
    (qualifier) => !qualifierTagsById.has(qualifier.tag_id),
  )
  const qualifierTagsToAdd = allQualifierTags.filter((tag) => !currentQualifiersByTagId.has(tag.id))

  await Promise.all(
    qualifiersToRemove.map(async (qualifier) => {
      await client.collection_qualifiers.delete({ where: { id: qualifier.id } })
      await createEditHistoryEntry(client, {
        entityTable: 'collection_qualifiers',
        entityId: qualifier.id,
        previousValue: qualifier,
        newValue: null,
        editSummary: `Removed qualifier "${qualifier.tags.name ?? qualifier.tag_id}" from collection "${collection.tags.name ?? collection.tag_id}"`,
      })
    }),
  )
  await Promise.all(
    qualifierTagsToAdd.map(async (tag) => {
      const qualifier = await client.collection_qualifiers.create({
        data: {
          id: crypto.randomUUID(),
          collection_id: collection.id,
          tag_id: tag.id,
        },
      })
      await createEditHistoryEntry(client, {
        entityTable: 'collection_qualifiers',
        entityId: qualifier.id,
        previousValue: null,
        newValue: { ...qualifier, tags: tag },
        editSummary: `Added qualifier "${tag.name ?? tag.id}" to collection "${collection.tags.name ?? collection.tag_id}"`,
      })
    }),
  )

  const collectionNotes = input.collectionNotes?.trim() || null
  const fedoraNodeId = input.fedoraNodeId?.trim() || null
  if (collection.notes === collectionNotes && collection.fedora_node_id === fedoraNodeId) {
    return
  }

  const updatedCollection = await client.collections.update({
    where: { id: collection.id },
    data: {
      notes: collectionNotes,
      fedora_node_id: fedoraNodeId,
    },
    include: {
      tags: true,
      collection_qualifiers: { include: { tags: true } },
    },
  })
  await createEditHistoryEntry(client, {
    entityTable: 'collections',
    entityId: collection.id,
    previousValue: collection,
    newValue: updatedCollection,
    editSummary: `Updated collection "${collection.tags.name ?? collection.tag_id}"`,
  })
}

export async function renameCollection(input: RenameCollectionInput): Promise<void> {
  await db.$transaction(async (tx) => {
    await renameCollectionInTransaction(tx, input)
  })
}

export async function renameCollectionInTransaction(
  client: Prisma.TransactionClient | PrismaClient,
  input: RenameCollectionInput,
): Promise<void> {
  const collectionId = input.collectionId.trim()
  if (!collectionId) {
    throw new Error('Collection id is required.')
  }
  const collection = await client.collections.findUnique({
    where: { id: collectionId },
    include: {
      tags: true,
      collection_qualifiers: { include: { tags: true } },
    },
  })
  if (!collection) {
    throw new Error('Collection not found.')
  }

  const requestedTagId = input.nextCanonicalTagId?.trim()
  const requestedTagName = normalizeTagName(input.nextCanonicalTagName ?? '')
  if (!requestedTagId && !requestedTagName) {
    throw new Error('Select an existing tag or enter a new canonical tag name.')
  }
  const nextCanonicalTag = requestedTagId
    ? await client.tags.findUnique({ where: { id: requestedTagId } })
    : await findOrCreateCollectionTag(client, requestedTagName)
  if (!nextCanonicalTag) {
    throw new Error('Canonical tag not found.')
  }
  if (nextCanonicalTag.id === collection.tag_id) {
    throw new Error('Select a different canonical tag to rename this collection.')
  }
  const otherCollection = await client.collections.findUnique({ where: { tag_id: nextCanonicalTag.id } })
  if (otherCollection) {
    throw new Error('The selected tag is already the canonical tag for another collection.')
  }

  const currentMemberDocumentIds = input.keepCurrentMembers
    ? await getCollectionMemberDocumentIds(
        collection.id,
        client as unknown as CollectionMembershipDataClient,
      )
    : []
  const duplicatedQualifier = collection.collection_qualifiers.find(
    (qualifier) => qualifier.tag_id === nextCanonicalTag.id,
  )
  if (duplicatedQualifier) {
    await client.collection_qualifiers.delete({ where: { id: duplicatedQualifier.id } })
    await createEditHistoryEntry(client, {
      entityTable: 'collection_qualifiers',
      entityId: duplicatedQualifier.id,
      previousValue: duplicatedQualifier,
      newValue: null,
      editSummary: `Removed qualifier "${duplicatedQualifier.tags.name ?? duplicatedQualifier.tag_id}" while renaming collection "${collection.tags.name ?? collection.tag_id}"`,
    })
  }

  const renamedCollection = await client.collections.update({
    where: { id: collection.id },
    data: { tag_id: nextCanonicalTag.id },
    include: { tags: true, collection_qualifiers: { include: { tags: true } } },
  })
  await createEditHistoryEntry(client, {
    entityTable: 'collections',
    entityId: collection.id,
    previousValue: collection,
    newValue: renamedCollection,
    editSummary: `Renamed collection "${collection.tags.name ?? collection.tag_id}" to "${nextCanonicalTag.name ?? nextCanonicalTag.id}"`,
  })

  if (currentMemberDocumentIds.length === 0) {
    return
  }
  const existingAssociations = await client.document_to_tags.findMany({
    where: {
      document_id: { in: currentMemberDocumentIds },
      tag_id: nextCanonicalTag.id,
    },
    select: { document_id: true },
  })
  const existingDocumentIds = new Set(existingAssociations.map((association) => association.document_id))
  await Promise.all(
    currentMemberDocumentIds
      .filter((documentId) => !existingDocumentIds.has(documentId))
      .map(async (documentId) => {
        const association = await client.document_to_tags.create({
          data: { id: crypto.randomUUID(), document_id: documentId, tag_id: nextCanonicalTag.id },
        })
        await createEditHistoryEntry(client, {
          entityTable: 'document_to_tags',
          entityId: association.id,
          previousValue: null,
          newValue: association,
          editSummary: `Retained document association while renaming collection to "${nextCanonicalTag.name ?? nextCanonicalTag.id}"`,
        })
      }),
  )
}

async function findOrCreateCollectionTag(
  client: Prisma.TransactionClient | PrismaClient,
  tagName: string,
) {
  const nameHash = buildNameHash(tagName)
  const existingTag = await client.tags.findFirst({
    where: { OR: [{ name_hash: nameHash }, { name: tagName }] },
  })
  if (existingTag) {
    return existingTag
  }

  const createdTag = await client.tags.create({
    data: { id: crypto.randomUUID(), name: tagName },
  })
  await createEditHistoryEntry(client, {
    entityTable: 'tags',
    entityId: createdTag.id,
    previousValue: null,
    newValue: createdTag,
    editSummary: `Created tag "${createdTag.name}"`,
  })
  return createdTag
}

export async function deleteCollection(collectionId: string): Promise<void> {
  return deleteCollectionWithOptions(collectionId)
}

export interface DeleteCollectionOptions {
  deleteTagFromSystem?: boolean
}

export interface CollectionDeletionTag {
  tagId: string
  tagName: string
}

export interface CollectionDeletionBlocker extends CollectionDeletionTag {
  collectionId: string
  collectionName: string
}

export interface CollectionDeletionPreview {
  collectionId: string
  tagsToDelete: CollectionDeletionTag[]
  blockedTags: CollectionDeletionBlocker[]
}

export async function getCollectionDeletionPreview(
  collectionId: string,
  client: Prisma.TransactionClient | PrismaClient = db,
): Promise<CollectionDeletionPreview> {
  const collection = await client.collections.findUnique({
    where: { id: collectionId },
    include: {
      tags: true,
      collection_qualifiers: { include: { tags: true } },
    },
  })
  if (!collection) {
    throw new Error('Collection not found.')
  }

  const collectionTags = [
    { id: collection.tags.id, name: collection.tags.name ?? collection.tag_id },
    ...collection.collection_qualifiers.map((qualifier) => ({
      id: qualifier.tags.id,
      name: qualifier.tags.name ?? qualifier.tag_id,
    })),
  ].sort((left, right) => left.name.localeCompare(right.name))
  const tagIds = collectionTags.map((tag) => tag.id)
  const referencingCollections = await client.collections.findMany({
    where: {
      OR: [
        { tag_id: { in: tagIds } },
        { collection_qualifiers: { some: { tag_id: { in: tagIds } } } },
      ],
    },
    include: { tags: true, collection_qualifiers: { select: { tag_id: true } } },
  })

  const blockedByTagId = new Map<string, CollectionDeletionBlocker>()
  for (const tag of collectionTags) {
    const blockingCollection = referencingCollections.find(
      (candidate) =>
        candidate.id !== collection.id &&
        (candidate.tag_id === tag.id || candidate.collection_qualifiers.some((qualifier) => qualifier.tag_id === tag.id)),
    )
    if (blockingCollection) {
      blockedByTagId.set(tag.id, {
        tagId: tag.id,
        tagName: tag.name,
        collectionId: blockingCollection.id,
        collectionName: blockingCollection.tags.name ?? blockingCollection.tag_id,
      })
    }
  }

  return {
    collectionId: collection.id,
    tagsToDelete: collectionTags
      .filter((tag) => !blockedByTagId.has(tag.id))
      .map((tag) => ({ tagId: tag.id, tagName: tag.name })),
    blockedTags: collectionTags
      .map((tag) => blockedByTagId.get(tag.id))
      .filter((blocker): blocker is CollectionDeletionBlocker => blocker !== undefined),
  }
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
  const deletionPreview = options.deleteTagFromSystem
    ? await getCollectionDeletionPreview(collectionId, client)
    : null
  const collection = await client.collections.findUnique({
    where: { id: collectionId },
    include: { tags: true, collection_qualifiers: { include: { tags: true } } },
  })
  if (!collection) throw new Error('Collection not found.')

  await client.collections.delete({ where: { id: collectionId } })

  if (deletionPreview) {
    await Promise.all(
      deletionPreview.tagsToDelete.map((tag) => deleteTagAndDocumentAssociationsInTransaction(client, tag.tagId)),
    )
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

  await assertTagIsNotACollectionQualifier(client, tagId, tag.name)

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

  await assertTagIsNotACollectionQualifier(client, tagId, tag.name)

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

async function assertTagIsNotACollectionQualifier(
  client: Prisma.TransactionClient | PrismaClient,
  tagId: string,
  tagName: string | null,
): Promise<void> {
  const qualifier = await client.collection_qualifiers.findFirst({
    where: { tag_id: tagId },
    include: { collections: { include: { tags: true } } },
  })
  if (!qualifier) {
    return
  }

  const collectionName = qualifier.collections.tags.name ?? qualifier.collections.tag_id
  throw new Error(
    `Tag "${tagName ?? tagId}" cannot be deleted because it is associated with the ${collectionName} collection.`,
  )
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
  qualifierTagIds?: string[]
  qualifierTagNames?: string[]
  collectionNotes?: string
  tagNotes?: string
  fedoraNodeId?: string
}

export interface UpdateCollectionInput {
  collectionId: string
  qualifierTagIds: string[]
  qualifierTagNames?: string[]
  collectionNotes?: string | null
  fedoraNodeId?: string | null
}

export interface RenameCollectionInput {
  collectionId: string
  nextCanonicalTagId?: string
  nextCanonicalTagName?: string
  keepCurrentMembers: boolean
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
  memberDocumentIds?: string[]
  search?: string
  contributor?: string
  publisher?: string
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

  if (params.contributor?.trim()) {
    filterConditions.push(buildOverviewContributorSearchConditionSql(params.contributor))
  }

  if (params.publisher?.trim()) {
    filterConditions.push(buildOverviewPublisherSearchConditionSql(params.publisher))
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
        LEFT JOIN (
          SELECT dtm.document_id, dtm.value
          FROM document_to_metadata dtm
          INNER JOIN metadata m ON m.id = dtm.metadata_id
          WHERE m.name = 'source_id'
        ) AS source_meta ON source_meta.document_id = d.id
        LEFT JOIN document_quality dq ON dq.document_id = d.id
        WHERE d.id IN (${Prisma.join(params.memberDocumentIds ?? [])})
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
  const memberDocumentIds = await getCollectionMemberDocumentIds(
    collectionId,
    client as unknown as CollectionMembershipDataClient,
  )
  if (memberDocumentIds.length === 0) {
    return { documents: [], total: 0 }
  }

  return getCollectionDocumentsPage(
    {
      collectionId,
      memberDocumentIds,
      mode: 'in',
      ...params,
      contributor: normalizeTextFilter(params?.contributor),
      publisher: normalizeTextFilter(params?.publisher),
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
      contributor: normalizeTextFilter(params?.contributor),
      publisher: normalizeTextFilter(params?.publisher),
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

  await db.$transaction(async (tx) => {
    const collection = await tx.collections.findUnique({
      where: { id: collectionId },
      include: { tags: true },
    })

    if (!collection) {
      throw new Error('Collection not found')
    }

    const documentNames = await tx.documents.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, name: true },
    })

    const nameMap = new Map(documentNames.map((d) => [d.id, d.name ?? 'Untitled']))
    const upsertResults = await Promise.all(
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
    await refreshDocumentReadinessInTransaction(
      tx,
      upsertResults.map((result) => result.document_id),
    )
  })
}

export async function removeDocumentsFromCollection(collectionId: string, documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) {
    return
  }

  await db.$transaction(async (tx) => {
    const collection = await tx.collections.findUnique({
      where: { id: collectionId },
      include: { tags: true },
    })

    if (!collection) {
      throw new Error('Collection not found')
    }

    const rowsToDelete = await tx.document_to_tags.findMany({
      where: {
        document_id: { in: documentIds },
        tag_id: collection.tag_id,
      },
      include: { documents: { select: { name: true } }, tags: true },
    })

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
    await refreshDocumentReadinessInTransaction(
      tx,
      rowsToDelete.map((row) => row.document_id),
    )
  })
}
export async function updateDocumentCollectionTags(documentId: string, collectionTags: string[]): Promise<boolean> {
  const requestedNames = [...new Set(collectionTags.map((tag) => tag.trim()).filter(Boolean))]

  return db.$transaction(async (tx) => {
    const document = await tx.documents.findUnique({
      where: { id: documentId },
      select: { id: true },
    })
    if (!document) {
      return false
    }

    const collections = await tx.collections.findMany({
      include: { tags: true },
    })
    const collectionsByName = new Map(
      collections
        .map((collection) => [collection.tags.name?.trim(), collection] as const)
        .filter(([name]) => Boolean(name)),
    )
    const requestedCollections = requestedNames
      .map((name) => collectionsByName.get(name))
      .filter((collection): collection is (typeof collections)[number] => collection !== undefined)

    if (requestedCollections.length !== requestedNames.length) {
      throw new Error('One or more selected collections could not be found.')
    }

    const collectionTagIds = collections.map((collection) => collection.tag_id)
    const currentAssociations = await tx.document_to_tags.findMany({
      where: {
        document_id: documentId,
        tag_id: { in: collectionTagIds },
      },
      include: { documents: { select: { name: true } }, tags: true },
    })

    const requestedTagIds = new Set(requestedCollections.map((collection) => collection.tag_id))
    const currentTagIds = new Set(currentAssociations.map((association) => association.tag_id))
    const associationsToRemove = currentAssociations.filter((association) => !requestedTagIds.has(association.tag_id))
    const collectionsToAdd = requestedCollections.filter((collection) => !currentTagIds.has(collection.tag_id))

    await Promise.all(
      associationsToRemove.map(async (association) => {
        await tx.document_to_tags.delete({ where: { id: association.id } })
        await createEditHistoryEntry(tx, {
          entityTable: 'document_to_tags',
          entityId: association.id,
          previousValue: association,
          newValue: null,
          editSummary: `Removed document "${association.documents?.name ?? 'Untitled'}" from collection "${association.tags.name}"`,
        })
      }),
    )

    await Promise.all(
      collectionsToAdd.map(async (collection) => {
        const association = await tx.document_to_tags.create({
          data: {
            id: crypto.randomUUID(),
            document_id: documentId,
            tag_id: collection.tag_id,
          },
          include: { documents: { select: { name: true } }, tags: true },
        })
        await createEditHistoryEntry(tx, {
          entityTable: 'document_to_tags',
          entityId: association.id,
          previousValue: null,
          newValue: association,
          editSummary: `Added document "${association.documents?.name ?? 'Untitled'}" to collection "${collection.tags.name}"`,
        })
      }),
    )

    if (associationsToRemove.length > 0 || collectionsToAdd.length > 0) {
      await markDocumentBatchesPublicationLocked(tx, documentId)
      await refreshDocumentReadinessInTransaction(tx, [documentId])
    }

    return true
  })
}
