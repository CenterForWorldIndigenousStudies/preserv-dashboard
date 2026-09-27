import { GENERATED_COLLECTION_MEMBERSHIP_METADATA_FIELDS } from '@constants/generated/collectionMembership'

export interface CollectionQualifier {
  id: string
  name: string
}

export interface CollectionDefinition {
  id: string
  name: string
  canonicalTag: CollectionQualifier
  qualifiers: readonly CollectionQualifier[]
  fedoraNodeId: string | null
}

export interface CollectionMembershipEvidence {
  source: 'tag' | 'metadata'
  qualifierTagId: string
  qualifierName: string
  metadataName?: string
  metadataValue?: string
}

export interface CollectionMembership {
  collectionId: string
  collectionName: string
  fedoraNodeId: string | null
  evidence: CollectionMembershipEvidence[]
}

interface IndexedQualifier {
  key: string
  order: number
  collection: CollectionDefinition
  qualifier: CollectionQualifier
}

export interface CollectionMembershipResolver {
  resolve(input: { documentTagIds: ReadonlySet<string>; metadata: Record<string, unknown> }): CollectionMembership[]
}

export function normalizeCollectionValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function resolveCollectionMemberships({
  documentTagIds,
  metadata,
  collections,
}: {
  documentTagIds: ReadonlySet<string>
  metadata: Record<string, unknown>
  collections: readonly CollectionDefinition[]
}): CollectionMembership[] {
  return buildCollectionMembershipResolver(collections).resolve({ documentTagIds, metadata })
}

export function buildCollectionMembershipResolver(
  collections: readonly CollectionDefinition[],
): CollectionMembershipResolver {
  const indexedQualifiers: IndexedQualifier[] = []
  const qualifiersByTagId = new Map<string, IndexedQualifier[]>()
  const qualifiersByName = new Map<string, IndexedQualifier[]>()

  for (const collection of collections) {
    for (const qualifier of [collection.canonicalTag, ...collection.qualifiers]) {
      const indexedQualifier: IndexedQualifier = {
        key: `${collection.id}\u0000${qualifier.id}`,
        order: indexedQualifiers.length,
        collection,
        qualifier,
      }
      indexedQualifiers.push(indexedQualifier)
      addIndexValue(qualifiersByTagId, qualifier.id, indexedQualifier)
      addIndexValue(qualifiersByName, normalizeCollectionValue(qualifier.name), indexedQualifier)
    }
  }

  const qualifierByKey = new Map(indexedQualifiers.map((qualifier) => [qualifier.key, qualifier]))

  return {
    resolve: ({ documentTagIds, metadata }) => {
      const matchedTagKeys = new Set<string>()
      const metadataEvidenceByKey = new Map<string, CollectionMembershipEvidence[]>()

      for (const tagId of documentTagIds) {
        for (const qualifier of qualifiersByTagId.get(tagId) ?? []) {
          matchedTagKeys.add(qualifier.key)
        }
      }

      for (const metadataName of GENERATED_COLLECTION_MEMBERSHIP_METADATA_FIELDS) {
        for (const metadataValue of stringMetadataValues(metadata[metadataName])) {
          for (const qualifier of qualifiersByName.get(normalizeCollectionValue(metadataValue)) ?? []) {
            const evidence = metadataEvidenceByKey.get(qualifier.key) ?? []
            evidence.push({
              source: 'metadata',
              qualifierTagId: qualifier.qualifier.id,
              qualifierName: qualifier.qualifier.name,
              metadataName,
              metadataValue,
            })
            metadataEvidenceByKey.set(qualifier.key, evidence)
          }
        }
      }

      const matchedQualifiers = [...new Set([...matchedTagKeys, ...metadataEvidenceByKey.keys()])]
        .map((key) => qualifierByKey.get(key))
        .filter((qualifier): qualifier is IndexedQualifier => qualifier !== undefined)
        .sort((left, right) => left.order - right.order)
      const memberships = new Map<string, CollectionMembership>()

      for (const qualifier of matchedQualifiers) {
        const evidence: CollectionMembershipEvidence[] = []
        if (matchedTagKeys.has(qualifier.key)) {
          evidence.push({
            source: 'tag',
            qualifierTagId: qualifier.qualifier.id,
            qualifierName: qualifier.qualifier.name,
          })
        }
        evidence.push(...(metadataEvidenceByKey.get(qualifier.key) ?? []))

        const membership = memberships.get(qualifier.collection.id) ?? {
          collectionId: qualifier.collection.id,
          collectionName: qualifier.collection.name,
          fedoraNodeId: qualifier.collection.fedoraNodeId,
          evidence: [],
        }
        membership.evidence.push(...evidence)
        memberships.set(qualifier.collection.id, membership)
      }

      return collections
        .map((collection) => memberships.get(collection.id))
        .filter((membership): membership is CollectionMembership => membership !== undefined)
    },
  }
}

function addIndexValue(index: Map<string, IndexedQualifier[]>, key: string, qualifier: IndexedQualifier): void {
  const values = index.get(key) ?? []
  values.push(qualifier)
  index.set(key, values)
}

function stringMetadataValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
