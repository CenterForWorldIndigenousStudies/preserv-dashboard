import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  mockDocumentFindUnique,
  mockDocumentQualityFindUnique,
  mockDocumentVersionsFindMany,
  mockDocumentToMetadataFindMany,
  mockDocumentToBatchesFindMany,
  mockDocumentToAuthorsFindMany,
  mockDocumentToTagsFindMany,
  mockVersionGroupsFindUnique,
} = vi.hoisted(() => ({
  mockDocumentFindUnique: vi.fn(),
  mockDocumentQualityFindUnique: vi.fn(),
  mockDocumentVersionsFindMany: vi.fn(),
  mockDocumentToMetadataFindMany: vi.fn(),
  mockDocumentToBatchesFindMany: vi.fn(),
  mockDocumentToAuthorsFindMany: vi.fn(),
  mockDocumentToTagsFindMany: vi.fn(),
  mockVersionGroupsFindUnique: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    documents: { findUnique: mockDocumentFindUnique },
    document_quality: { findUnique: mockDocumentQualityFindUnique },
    document_versions: { findMany: mockDocumentVersionsFindMany },
    document_to_metadata: { findMany: mockDocumentToMetadataFindMany },
    document_to_batches: { findMany: mockDocumentToBatchesFindMany },
    document_to_authors: { findMany: mockDocumentToAuthorsFindMany },
    document_to_tags: { findMany: mockDocumentToTagsFindMany },
    version_groups: { findUnique: mockVersionGroupsFindUnique },
  },
}))

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import { getDocumentDetail } from '@lib/queries'

describe('getDocumentDetail version family mapping', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deduplicates the canonical family row and forces canonical to display first as non-duplicate', async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: 'canonical-1',
      filesize: 1024,
      hash_binary: 'binary-a',
      hash_content: 'content-a',
      id_legacy: 'file-1',
      name: 'Canonical.pdf',
      created_at: new Date('2026-05-18T10:00:00Z'),
      updated_at: new Date('2026-05-18T10:00:00Z'),
    })
    mockDocumentQualityFindUnique.mockResolvedValue(null)
    mockDocumentVersionsFindMany
      .mockResolvedValueOnce([
        {
          id: 'dv-canonical',
          document_id: 'canonical-1',
          version_group_id: 'vg-1',
          notes: null,
          changes_summary: null,
          analyzed_at: null,
          created_at: new Date('2026-05-18T10:01:00Z'),
          updated_at: new Date('2026-05-18T10:01:00Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'dv-canonical',
          document_id: 'canonical-1',
          version_group_id: 'vg-1',
          created_at: new Date('2026-05-18T10:01:00Z'),
          version_groups: {
            id: 'vg-1',
            canonical_document_id: 'canonical-1',
            documents: {
              id: 'canonical-1',
              filesize: 1024,
              hash_binary: 'binary-a',
              hash_content: 'content-a',
              id_legacy: 'file-1',
              name: 'Canonical.pdf',
              created_at: new Date('2026-05-18T10:00:00Z'),
              updated_at: new Date('2026-05-18T10:00:00Z'),
              document_to_tags: [{ tags: { name: 'duplicate_document' } }],
            },
            document_versions: [
              {
                id: 'dv-canonical',
                documents: {
                  id: 'canonical-1',
                  filesize: 1024,
                  hash_binary: 'binary-a',
                  hash_content: 'content-a',
                  id_legacy: 'file-1',
                  name: 'Canonical.pdf',
                  created_at: new Date('2026-05-18T10:00:00Z'),
                  updated_at: new Date('2026-05-18T10:00:00Z'),
                  document_to_tags: [{ tags: { name: 'duplicate_document' } }],
                },
              },
              {
                id: 'dv-duplicate',
                documents: {
                  id: 'duplicate-1',
                  filesize: 1024,
                  hash_binary: 'binary-a',
                  hash_content: 'content-a',
                  id_legacy: 'file-2',
                  name: 'Duplicate.pdf',
                  created_at: new Date('2026-05-18T10:02:00Z'),
                  updated_at: new Date('2026-05-18T10:02:00Z'),
                  document_to_tags: [{ tags: { name: 'duplicate_document' } }],
                },
              },
            ],
          },
        },
      ])
    mockDocumentToMetadataFindMany.mockResolvedValue([])
    mockDocumentToBatchesFindMany.mockResolvedValue([])
    mockDocumentToAuthorsFindMany.mockResolvedValue([])
    mockDocumentToTagsFindMany.mockResolvedValue([{ tags: { name: 'duplicate_document' } }])
    mockVersionGroupsFindUnique.mockResolvedValue(null)

    const result = await getDocumentDetail('canonical-1')

    expect(result).not.toBeNull()
    expect(result?.version_family).not.toBeNull()
    expect(result?.version_family?.documents).toHaveLength(2)
    expect(result?.version_family?.documents[0]).toMatchObject({
      id: 'canonical-1',
      is_canonical: true,
      is_duplicate: false,
    })
    expect(result?.version_family?.documents[1]).toMatchObject({
      id: 'duplicate-1',
      is_canonical: false,
      is_duplicate: true,
    })
  })
})
