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

  function mockBaseDocument(overrides: Partial<Record<string, unknown>> = {}): void {
    mockDocumentFindUnique.mockResolvedValue({
      id: 'canonical-1',
      filesize: 1024,
      hash_binary: 'binary-a',
      hash_content: 'content-a',
      id_legacy: 'file-1',
      name: 'Canonical.pdf',
      created_at: new Date('2026-05-18T10:00:00Z'),
      updated_at: new Date('2026-05-18T10:00:00Z'),
      ...overrides,
    })
    mockDocumentQualityFindUnique.mockResolvedValue(null)
    mockDocumentToMetadataFindMany.mockResolvedValue([])
    mockDocumentToBatchesFindMany.mockResolvedValue([])
    mockDocumentToAuthorsFindMany.mockResolvedValue([])
    mockVersionGroupsFindUnique.mockResolvedValue(null)
  }

  it('deduplicates the canonical family row and forces canonical to display first as non-duplicate', async () => {
    mockBaseDocument()
    mockDocumentVersionsFindMany
      .mockResolvedValueOnce([
        {
          id: 'dv-canonical',
          document_id: 'canonical-1',
          version_group_id: 'vg-1',
          notes: null,
          changes_summary: null,
          similarity_score: 0.99,
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
                  document_to_metadata: [],
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
                  document_to_metadata: [],
                  document_to_tags: [{ tags: { name: 'duplicate_document' } }],
                },
              },
            ],
          },
        },
      ])
    mockDocumentToTagsFindMany.mockResolvedValue([{ tags: { name: 'duplicate_document' } }])

    const result = await getDocumentDetail('canonical-1')

    expect(result).not.toBeNull()
    expect(result?.versions).toEqual([
      {
        id: 'dv-canonical',
        document_id: 'canonical-1',
        version_group_id: 'vg-1',
        notes: null,
        changes_summary: null,
        similarity_score: 0.99,
        created_at: new Date('2026-05-18T10:01:00Z'),
        updated_at: new Date('2026-05-18T10:01:00Z'),
        analyzed_at: null,
      },
    ])
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

  it('returns a single-document version family for canonical-only version groups', async () => {
    mockBaseDocument()
    mockDocumentVersionsFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    mockDocumentToTagsFindMany.mockResolvedValue([])
    mockVersionGroupsFindUnique.mockResolvedValue({
      id: 'vg-canonical-only',
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
        document_to_metadata: [],
        document_to_tags: [],
      },
      document_versions: [],
    })

    const result = await getDocumentDetail('canonical-1')

    expect(result?.version_family).toEqual({
      version_group_id: 'vg-canonical-only',
      canonical_document_id: 'canonical-1',
      documents: [
        {
          id: 'canonical-1',
          filesize: 1024,
          hash_binary: 'binary-a',
          hash_content: 'content-a',
          id_legacy: 'file-1',
          source_id: null,
          name: 'Canonical.pdf',
          created_at: new Date('2026-05-18T10:00:00Z'),
          updated_at: new Date('2026-05-18T10:00:00Z'),
          is_canonical: true,
          is_preservation_candidate: false,
          is_duplicate: false,
        },
      ],
    })
    expect(result?.versions).toEqual([])
  })

  it('marks version family documents as preservation candidates when preservation_candidate metadata is truthy', async () => {
    mockBaseDocument()
    mockDocumentVersionsFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    mockDocumentToTagsFindMany.mockResolvedValue([])
    mockVersionGroupsFindUnique.mockResolvedValue({
      id: 'vg-candidate',
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
        document_to_tags: [],
        document_to_metadata: [
          {
            value: '{"value": true}',
            value_type: 'boolean',
            metadata: { name: 'preservation_candidate' },
          },
          {
            value: '{"value": "drive-file-123"}',
            value_type: 'string',
            metadata: { name: 'source_id' },
          },
        ],
      },
      document_versions: [],
    })

    const result = await getDocumentDetail('canonical-1')

    expect(result?.version_family?.documents[0]).toMatchObject({
      id: 'canonical-1',
      is_preservation_candidate: true,
      source_id: 'drive-file-123',
    })
  })

  it('maps detail versions fields without changing stored values', async () => {
    mockBaseDocument()
    mockDocumentVersionsFindMany
      .mockResolvedValueOnce([
        {
          id: 'dv-one',
          document_id: 'canonical-1',
          version_group_id: 'vg-1',
          notes: 'Normalized from source artifact',
          changes_summary: 'Deskewed and OCRed',
          similarity_score: 0.875,
          analyzed_at: BigInt(1760000000),
          created_at: new Date('2026-05-18T11:00:00Z'),
          updated_at: new Date('2026-05-18T12:00:00Z'),
        },
        {
          id: 'dv-two',
          document_id: 'canonical-1',
          version_group_id: 'vg-2',
          notes: null,
          changes_summary: null,
          similarity_score: null,
          analyzed_at: null,
          created_at: new Date('2026-05-19T11:00:00Z'),
          updated_at: new Date('2026-05-19T12:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([])
    mockDocumentToTagsFindMany.mockResolvedValue([])

    const result = await getDocumentDetail('canonical-1')

    expect(result?.versions).toEqual([
      {
        id: 'dv-one',
        document_id: 'canonical-1',
        version_group_id: 'vg-1',
        notes: 'Normalized from source artifact',
        changes_summary: 'Deskewed and OCRed',
        similarity_score: 0.875,
        analyzed_at: 1760000000,
        created_at: new Date('2026-05-18T11:00:00Z'),
        updated_at: new Date('2026-05-18T12:00:00Z'),
      },
      {
        id: 'dv-two',
        document_id: 'canonical-1',
        version_group_id: 'vg-2',
        notes: null,
        changes_summary: null,
        similarity_score: null,
        analyzed_at: null,
        created_at: new Date('2026-05-19T11:00:00Z'),
        updated_at: new Date('2026-05-19T12:00:00Z'),
      },
    ])
    expect(result?.version_family).toBeNull()
  })
})
