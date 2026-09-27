import { db } from '@lib/db'
import { GENERATED_COLLECTION_MEMBERSHIP_METADATA_FIELDS } from '@constants/generated/collectionMembership'
import {
  buildCollectionMembershipResolver,
  type CollectionDefinition,
  type CollectionMembership,
} from '@lib/collectionMembership'

interface CollectionRow {
  id: string
  fedora_node_id: string | null
  tags: { id: string; name: string | null }
  collection_qualifiers: Array<{ tags: { id: string; name: string | null } }>
}

interface DocumentTagRow {
  document_id?: string
  tag_id: string
}

interface DocumentMetadataRow {
  document_id?: string
  value: string | null
  metadata: { name: string }
}

interface DocumentRow {
  id: string
}

export interface CollectionMembershipDataClient {
  collections: {
    findMany(args: unknown): Promise<CollectionRow[]>
  }
  document_to_tags: {
    findMany(args: unknown): Promise<DocumentTagRow[]>
  }
  document_to_metadata: {
    findMany(args: unknown): Promise<DocumentMetadataRow[]>
  }
  documents?: {
    findMany(args: unknown): Promise<DocumentRow[]>
  }
}

export interface CollectionMembershipIndex {
  documentIdsByCollection: Map<string, string[]>
  counts: Map<string, number>
}

export interface CollectionMembershipIndexOptions {
  collectionIds?: readonly string[]
}

export async function getDocumentCollectionMemberships(
  documentId: string,
  client?: CollectionMembershipDataClient,
): Promise<CollectionMembership[]> {
  const dataClient = client ?? (db as unknown as CollectionMembershipDataClient)
  const [collectionRows, tagRows, metadataRows] = await Promise.all([
    dataClient.collections.findMany({
      include: {
        tags: { select: { id: true, name: true } },
        collection_qualifiers: { include: { tags: { select: { id: true, name: true } } } },
      },
    }),
    dataClient.document_to_tags.findMany({ where: { document_id: documentId }, select: { tag_id: true } }),
    dataClient.document_to_metadata.findMany({
      where: { document_id: documentId },
      select: { value: true, metadata: { select: { name: true } } },
    }),
  ])

  const collections = collectionRows.flatMap((collection): CollectionDefinition[] => {
    if (!collection.tags.name) return []
    return [
      {
        id: collection.id,
        name: collection.tags.name,
        canonicalTag: { id: collection.tags.id, name: collection.tags.name },
        qualifiers: collection.collection_qualifiers.flatMap((qualifier) =>
          qualifier.tags.name ? [{ id: qualifier.tags.id, name: qualifier.tags.name }] : [],
        ),
        fedoraNodeId: collection.fedora_node_id,
      },
    ]
  })
  const metadata = Object.fromEntries(
    metadataRows.map((row) => [row.metadata.name, unwrapStoredMetadataValue(row.value)]),
  )

  return buildCollectionMembershipResolver(collections).resolve({
    documentTagIds: new Set(tagRows.map((row) => row.tag_id)),
    metadata,
  })
}

export async function getCollectionMemberDocumentIds(
  collectionId: string,
  client?: CollectionMembershipDataClient,
): Promise<string[]> {
  const memberships = await getAllDocumentCollectionMemberships(client, { collectionIds: [collectionId] })
  return memberships.flatMap((document) =>
    document.memberships.some((membership) => membership.collectionId === collectionId) ? [document.documentId] : [],
  )
}

export async function getCollectionMemberDocumentIdsByCollection(
  client?: CollectionMembershipDataClient,
): Promise<Map<string, string[]>> {
  return (await getCollectionMembershipIndex(client)).documentIdsByCollection
}

export async function getCollectionMemberDocumentCounts(
  client?: CollectionMembershipDataClient,
): Promise<Map<string, number>> {
  return (await getCollectionMembershipIndex(client)).counts
}

export async function getCollectionMembershipIndex(
  client?: CollectionMembershipDataClient,
  options: CollectionMembershipIndexOptions = {},
): Promise<CollectionMembershipIndex> {
  const memberships = await getAllDocumentCollectionMemberships(client, options)
  const documentIdsByCollection = new Map<string, string[]>()
  const counts = new Map<string, number>()

  for (const document of memberships) {
    for (const membership of document.memberships) {
      const documentIds = documentIdsByCollection.get(membership.collectionId) ?? []
      documentIds.push(document.documentId)
      documentIdsByCollection.set(membership.collectionId, documentIds)
      counts.set(membership.collectionId, (counts.get(membership.collectionId) ?? 0) + 1)
    }
  }

  return { documentIdsByCollection, counts }
}

async function getAllDocumentCollectionMemberships(
  client?: CollectionMembershipDataClient,
  options: CollectionMembershipIndexOptions = {},
): Promise<Array<{ documentId: string; memberships: CollectionMembership[] }>> {
  const dataClient = client ?? (db as unknown as CollectionMembershipDataClient)
  const collectionRows = await dataClient.collections.findMany({
    ...(options.collectionIds ? { where: { id: { in: options.collectionIds } } } : {}),
    include: {
      tags: { select: { id: true, name: true } },
      collection_qualifiers: { include: { tags: { select: { id: true, name: true } } } },
    },
  })
  const collections = toCollectionDefinitions(collectionRows)
  if (collections.length === 0) {
    return []
  }
  const membershipResolver = buildCollectionMembershipResolver(collections)
  const qualifierTagIds = collections.flatMap((collection) => [
    collection.canonicalTag.id,
    ...collection.qualifiers.map((qualifier) => qualifier.id),
  ])
  const [tagRows, metadataRows] = await Promise.all([
    dataClient.document_to_tags.findMany({
      where: { tag_id: { in: qualifierTagIds } },
      select: { document_id: true, tag_id: true },
    }),
    dataClient.document_to_metadata.findMany({
      where: { metadata: { name: { in: GENERATED_COLLECTION_MEMBERSHIP_METADATA_FIELDS } } },
      select: { document_id: true, value: true, metadata: { select: { name: true } } },
    }),
  ])
  const tagIdsByDocument = new Map<string, Set<string>>()
  for (const row of tagRows) {
    if (!row.document_id) continue
    const tagIds = tagIdsByDocument.get(row.document_id) ?? new Set<string>()
    tagIds.add(row.tag_id)
    tagIdsByDocument.set(row.document_id, tagIds)
  }
  const metadataByDocument = new Map<string, Record<string, unknown>>()
  for (const row of metadataRows) {
    if (!row.document_id) continue
    const metadata = metadataByDocument.get(row.document_id) ?? {}
    metadata[row.metadata.name] = unwrapStoredMetadataValue(row.value)
    metadataByDocument.set(row.document_id, metadata)
  }

  const documentIds = new Set<string>([
    ...tagIdsByDocument.keys(),
    ...metadataByDocument.keys(),
  ])

  return [...documentIds].map((documentId) => ({
    documentId,
    memberships: membershipResolver.resolve({
      documentTagIds: tagIdsByDocument.get(documentId) ?? new Set<string>(),
      metadata: metadataByDocument.get(documentId) ?? {},
    }),
  }))
}

function toCollectionDefinitions(collectionRows: CollectionRow[]): CollectionDefinition[] {
  return collectionRows.flatMap((collection): CollectionDefinition[] => {
    if (!collection.tags.name) return []
    return [
      {
        id: collection.id,
        name: collection.tags.name,
        canonicalTag: { id: collection.tags.id, name: collection.tags.name },
        qualifiers: collection.collection_qualifiers.flatMap((qualifier) =>
          qualifier.tags.name ? [{ id: qualifier.tags.id, name: qualifier.tags.name }] : [],
        ),
        fedoraNodeId: collection.fedora_node_id,
      },
    ]
  })
}

function unwrapStoredMetadataValue(value: string | null): unknown {
  if (!value) return null
  try {
    let parsed: unknown = JSON.parse(value)
    while (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 1 &&
      'value' in parsed
    ) {
      parsed = parsed.value
    }
    return parsed
  } catch {
    return value
  }
}
