import { describe, expect, it, vi } from 'vitest'

import {
  getCollectionMemberDocumentIds,
  getCollectionMembershipIndex,
  getDocumentCollectionMemberships,
} from '@lib/queries/collectionMembershipQueries'

describe('getDocumentCollectionMemberships', () => {
  it('returns metadata-only membership with the stored matching value as evidence', async () => {
    const memberships = await getDocumentCollectionMemberships('document-1', {
      collections: {
        findMany: () => Promise.resolve([
          {
            id: 'collection-1',
            fedora_node_id: '17',
            tags: { id: 'canonical-tag', name: 'Archive' },
            collection_qualifiers: [{ tags: { id: 'subject-tag', name: 'Community History' } }],
          },
        ]),
      },
      document_to_tags: {
        findMany: () => Promise.resolve([]),
      },
      document_to_metadata: {
        findMany: () => Promise.resolve([
          {
            value: JSON.stringify({ value: ['  community   history  '] }),
            metadata: { name: 'dc_subject' },
          },
        ]),
      },
    })

    expect(memberships).toEqual([
      {
        collectionId: 'collection-1',
        collectionName: 'Archive',
        fedoraNodeId: '17',
        evidence: [
          {
            source: 'metadata',
            qualifierTagId: 'subject-tag',
            qualifierName: 'Community History',
            metadataName: 'dc_subject',
            metadataValue: '  community   history  ',
          },
        ],
      },
    ])
  })

  it('resolves documents that qualify through metadata in bulk', async () => {
    const findDocumentTags = vi.fn(() =>
      Promise.resolve([{ document_id: 'other-document', tag_id: 'unrelated-tag' }]),
    )
    const findDocumentMetadata = vi.fn(() =>
      Promise.resolve([
        {
          document_id: 'metadata-only-document',
          value: JSON.stringify({ value: 'Community History' }),
          metadata: { name: 'dc_subject' },
        },
      ]),
    )
    const documentIds = await getCollectionMemberDocumentIds('collection-1', {
      collections: {
        findMany: () => Promise.resolve([
          {
            id: 'collection-1',
            fedora_node_id: '17',
            tags: { id: 'canonical-tag', name: 'Archive' },
            collection_qualifiers: [{ tags: { id: 'subject-tag', name: 'Community History' } }],
          },
        ]),
      },
      documents: {
        findMany: () => Promise.resolve([{ id: 'metadata-only-document' }, { id: 'other-document' }]),
      },
      document_to_tags: {
        findMany: findDocumentTags,
      },
      document_to_metadata: {
        findMany: findDocumentMetadata,
      },
    })

    expect(documentIds).toEqual(['metadata-only-document'])
    expect(findDocumentTags).toHaveBeenCalledTimes(1)
    expect(findDocumentMetadata).toHaveBeenCalledTimes(1)
  })

  it('can index only the selected collections without loading every document', async () => {
    const findDocuments = vi.fn(() => Promise.resolve([{ id: 'unrelated-document' }]))

    const index = await getCollectionMembershipIndex(
      {
        collections: {
          findMany: (args: unknown) => {
            expect(args).toMatchObject({ where: { id: { in: ['collection-1'] } } })
            return Promise.resolve([
              {
                id: 'collection-1',
                fedora_node_id: '17',
                tags: { id: 'canonical-tag', name: 'Archive' },
                collection_qualifiers: [{ tags: { id: 'subject-tag', name: 'Community History' } }],
              },
            ])
          },
        },
        documents: { findMany: findDocuments },
        document_to_tags: {
          findMany: () => Promise.resolve([{ document_id: 'tagged-document', tag_id: 'subject-tag' }]),
        },
        document_to_metadata: {
          findMany: () => Promise.resolve([]),
        },
      },
      { collectionIds: ['collection-1'] },
    )

    expect(index.documentIdsByCollection.get('collection-1')).toEqual(['tagged-document'])
    expect(index.counts.get('collection-1')).toBe(1)
    expect(findDocuments).not.toHaveBeenCalled()
  })
})
