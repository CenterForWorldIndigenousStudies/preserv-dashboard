import { afterAll, afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the Prisma client via vi.hoisted() — ensures mocks are available at
// module scope before vi.mock() hoists the factory
// ---------------------------------------------------------------------------
const {
  mockQueryRaw,
  mockMetadataFindMany,
  mockQualityFindMany,
  mockAccessFindMany,
  mockDocumentMetadataFindMany,
  mockDocumentsFindMany,
  mockTagsFindMany,
  mockBatchesFindMany,
} = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockMetadataFindMany: vi.fn(),
  mockQualityFindMany: vi.fn(),
  mockAccessFindMany: vi.fn(),
  mockDocumentMetadataFindMany: vi.fn(),
  mockDocumentsFindMany: vi.fn(),
  mockTagsFindMany: vi.fn(),
  mockBatchesFindMany: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    $queryRaw: mockQueryRaw,
    metadata: { findMany: mockMetadataFindMany },
    document_quality: { findMany: mockQualityFindMany },
    document_access: { findMany: mockAccessFindMany },
    document_to_metadata: { findMany: mockDocumentMetadataFindMany },
    documents: { findMany: mockDocumentsFindMany },
    tags: { findMany: mockTagsFindMany },
    batches: { findMany: mockBatchesFindMany },
  },
}))

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import {
  buildReadyForLibraryItems,
  getAllDocuments,
  getDocuments,
  getNeedsReviewDocuments,
  getNeedsReviewDocumentsCount,
  getReadyForLibraryDocuments,
} from '@lib/queries/queries'

// ---------------------------------------------------------------------------
// Shared call inspection helpers
// ---------------------------------------------------------------------------
interface PrismaSqlCall {
  strings: string[]
  values: unknown[]
}

function queryCall(index = 0): PrismaSqlCall {
  return mockQueryRaw.mock.calls[index][0] as PrismaSqlCall
}

function queryText(index = 0): string {
  return queryCall(index).strings.join(' ')
}

// ---------------------------------------------------------------------------
// buildSearchWhere — verify author-only search logic via getAllDocuments
// ---------------------------------------------------------------------------
describe('buildSearchWhere (via getAllDocuments)', () => {
  beforeAll(() => {
    mockQueryRaw.mockResolvedValueOnce([])
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('returns empty where when search is undefined', async () => {
    await getAllDocuments({ search: undefined })
    expect(queryText(0)).not.toContain('WHERE (')
  })

  it('returns empty where when search is only whitespace', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({ search: '   ' })
    expect(queryText(0)).not.toContain('WHERE (')
  })

  it('applies an author-only EXISTS clause', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ search: 'test' })

    const sql = queryText(0)
    expect(sql).toContain('EXISTS (')
    expect(sql).toContain('FROM document_to_authors dta')
    expect(sql).toContain('INNER JOIN authors a ON a.id = dta.author_id')
    expect(sql).toContain('LOWER(a.name COLLATE utf8mb4_unicode_ci)')
    expect(sql).not.toContain('d.hash_binary LIKE')
    expect(sql).not.toContain('d.hash_content LIKE')
    expect(sql).not.toContain('d.id_legacy LIKE')
  })

  it('tokenizes and trims the author search term before applying the filter', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ search: '  Rudy, Rÿser  ' })

    const call = queryCall(0)
    expect(call.values.slice(0, 2)).toEqual(['%rudy%', '%ryser%'])
  })
})

describe('getReadyForLibraryDocuments advanced filters', () => {
  beforeEach(() => {
    mockQueryRaw.mockReset()
    mockMetadataFindMany.mockReset()
    mockQualityFindMany.mockReset()
    mockAccessFindMany.mockReset()
    mockDocumentMetadataFindMany.mockReset()
    mockDocumentsFindMany.mockReset()
    mockTagsFindMany.mockReset()
    mockBatchesFindMany.mockReset()

    mockMetadataFindMany.mockResolvedValue([
      { id: 'meta-title', name: 'dc_title' },
      { id: 'meta-type', name: 'dc_type' },
      { id: 'meta-subject', name: 'dc_subject' },
      { id: 'meta-rights', name: 'dc_rights' },
    ])
    mockQualityFindMany.mockResolvedValue([
      { document_id: 'doc-ready', validation_status: 'APPROVED', validation_timestamp: null },
    ])
    mockAccessFindMany.mockResolvedValue([
      {
        document_id: 'doc-ready',
        access_level_id: 'access-open',
        access_levels: { level_name: 'public' },
      },
    ])
    mockDocumentMetadataFindMany.mockResolvedValue([
      { document_id: 'doc-ready', metadata_id: 'meta-title' },
      { document_id: 'doc-ready', metadata_id: 'meta-type' },
      { document_id: 'doc-ready', metadata_id: 'meta-subject' },
      { document_id: 'doc-ready', metadata_id: 'meta-rights' },
    ])
    mockDocumentsFindMany.mockResolvedValue([{ id: 'doc-ready', name: 'Ready document' }])
    mockTagsFindMany.mockResolvedValue([{ id: 'tag-collection', name: 'collection-tag', notes: null }])
    mockBatchesFindMany.mockResolvedValue([{ id: 'batch-2026', name: 'batch-2026' }])
    mockQueryRaw.mockResolvedValueOnce([])
  })

  it('applies the full Advanced Search filter set to ready candidates before returning items', async () => {
    await getReadyForLibraryDocuments({
      author: 'Matching Author',
      tag: 'collection-tag',
      statuses: ['APPROVED'],
      documentType: 'duplicate',
      batch: 'batch-2026',
      createdFrom: '2026-04-01',
      createdTo: '2026-04-30',
      collection: 'Collection A',
      accessLevel: 'public',
    })

    const sql = queryText(0)
    expect(sql).toContain('d.id IN')
    expect(sql).toContain('FROM document_to_authors dta')
    expect(sql).toContain('FROM document_to_tags dtt')
    expect(sql).toContain('FROM document_to_batches dtb')
    expect(sql).toContain('d.created_at >=')
    expect(sql).toContain('d.created_at < DATE_ADD')
    expect(sql).toContain('LOWER(t.name)')
    expect(sql).toContain('LOWER(al.level_name)')
  })

  it('returns no ready documents when an explicit status filter excludes APPROVED', async () => {
    const result = await getReadyForLibraryDocuments({ statuses: ['NEEDS_REVIEW'] })

    expect(result).toEqual({ items: [], total: 0 })
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })
})

describe('buildReadyForLibraryItems', () => {
  it('builds readiness items only for approved documents with access', () => {
    const items = buildReadyForLibraryItems(
      [
        { document_id: 'doc-ready', validation_status: 'APPROVED', validation_timestamp: 123 },
        { document_id: 'doc-without-access', validation_status: 'APPROVED', validation_timestamp: null },
      ],
      new Map([
        ['doc-ready', 'public'],
        ['doc-without-access', undefined],
      ]),
      new Map([['doc-ready', new Set(['dc_title', 'dc_type', 'dc_subject', 'dc_rights'])]]),
      ['dc_title', 'dc_type', 'dc_subject', 'dc_rights'],
    )

    expect(items).toEqual([
      {
        id: 'doc-ready',
        name: null,
        validation_status: 'APPROVED',
        validation_timestamp: 123,
        metadata_complete: true,
        access_level: 'public',
      },
    ])
  })
})

// ---------------------------------------------------------------------------
// getAllDocuments — mocks Prisma, tests query-building logic
// ---------------------------------------------------------------------------
describe('getAllDocuments', () => {
  const defaultRow = {
    id: 'doc-1',
    filesize: null,
    hash_binary: null,
    hash_content: null,
    id_legacy: null,
    source_id: null,
    name: null,
    created_at: null,
    updated_at: null,
    is_duplicate: 0,
  }

  beforeAll(() => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])
  })

  afterEach(() => {
    mockQueryRaw.mockReset()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('uses default pageSize of 25', async () => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])

    await getAllDocuments()

    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })

  it('normalizes unsupported low page sizes up to 25', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ page: 3, pageSize: 10 })

    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })

  it('clamps oversized document table page sizes down to 500', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ pageSize: 5000 })

    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(501)
  })

  it('orders by name asc, updated_at asc, and id asc by default', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments()

    expect(queryText(0)).toContain(
      "ORDER BY\n        COALESCE(d.name, '') ASC,\n        COALESCE(d.updated_at, TIMESTAMP('1000-01-01 00:00:00')) ASC,\n        d.id ASC",
    )
  })

  it('respects orderBy and sortDirection', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ orderBy: 'name', sortDirection: 'asc' })

    expect(queryText(0)).toContain("ORDER BY COALESCE(d.name, '') ASC, d.id ASC")
  })

  it('supports sorting by source_id', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ orderBy: 'source_id', sortDirection: 'asc' })

    expect(queryText(0)).toContain(
      "ORDER BY COALESCE(JSON_UNQUOTE(JSON_EXTRACT(source_meta.value, '$.value')), JSON_UNQUOTE(JSON_EXTRACT(source_meta.value, '$')), source_meta.value, '') ASC, d.id ASC",
    )
  })

  it('supports sorting by is_duplicate', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ orderBy: 'is_duplicate', sortDirection: 'desc' })

    expect(queryText(0)).toContain('ORDER BY CASE WHEN dup.document_id IS NULL THEN 0 ELSE 1 END DESC')
  })

  it('returns data array and pageInfo', async () => {
    const row = { ...defaultRow, id: 'doc-1', name: 'Test Document' }
    mockQueryRaw.mockResolvedValueOnce([row])

    const result = await getAllDocuments()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('pageInfo')
    expect(result.data).toHaveLength(1)
    expect(result.pageInfo.page).toBe(1)
  })

  it('maps filesize BigInt to number', async () => {
    const row = {
      ...defaultRow,
      id: 'doc-2',
      filesize: BigInt(2048),
      name: 'File.pdf',
    }
    mockQueryRaw.mockResolvedValueOnce([row])

    const result = await getAllDocuments()

    expect(result.data[0].filesize).toBe(2048)
  })

  it('handles null filesize', async () => {
    const row = { ...defaultRow, id: 'doc-3', filesize: null }
    mockQueryRaw.mockResolvedValueOnce([row])

    const result = await getAllDocuments()

    expect(result.data[0].filesize).toBeNull()
  })

  it('maps source_id and duplicate flag', async () => {
    const row = { ...defaultRow, source_id: 'SRC-42', is_duplicate: 1 }
    mockQueryRaw.mockResolvedValueOnce([row])

    const result = await getAllDocuments()

    expect(result.data[0].source_id).toBe('SRC-42')
    expect(result.data[0].is_duplicate).toBe(true)
  })

  it('applies advanced search filters with AND logic', async () => {
    mockQueryRaw.mockResolvedValueOnce([])
    mockBatchesFindMany.mockResolvedValueOnce([{ id: 'batch-april', name: 'April batch' }])

    await getAllDocuments({
      search: 'Mary Ross',
      statuses: ['APPROVED', 'NEEDS_REVIEW'],
      documentType: 'duplicate',
      batch: 'April batch',
      createdFrom: '2026-04-01',
      createdTo: '2026-04-30',
      collection: 'Plateau',
      accessLevel: 'restricted',
    })

    const sql = queryText(0)
    expect(sql).toContain("LOWER(COALESCE(dq.validation_status, '')) IN")
    expect(sql).toContain('dup.document_id IS NOT NULL')
    expect(sql).toContain('FROM document_to_batches dtb')
    expect(sql).toContain('FROM document_to_tags dtt')
    expect(sql).toContain('LOWER(al.level_name) =')
    expect(sql).toContain('d.created_at >=')
    expect(sql).toContain('DATE_ADD(')
  })

  it('resolves a fuzzy Batch name to matching Batch IDs before building SQL', async () => {
    mockQueryRaw.mockResolvedValueOnce([])
    mockBatchesFindMany.mockResolvedValueOnce([
      { id: 'batch-special', name: 'Special RCR Writings September 25 2025' },
      { id: 'batch-other', name: 'Coastal Fisheries' },
    ])

    await getAllDocuments({ batch: 'Special RCR Writngs September 25 2025' })

    const sql = queryText(0)
    expect(sql).toContain('b.id IN')
    expect(sql).not.toContain('b.id_legacy')
    expect(sql).not.toContain('batch_origin')
    expect(queryCall(0).values).toContain('batch-special')
    expect(queryCall(0).values).not.toContain('batch-other')
  })

  it('returns an always-false predicate when no Batch name matches', async () => {
    mockQueryRaw.mockResolvedValueOnce([])
    mockBatchesFindMany.mockResolvedValueOnce([{ id: 'batch-special', name: 'Special RCR Writings' }])

    await getAllDocuments({ batch: 'legacy-batch-origin-only' })

    const sql = queryText(0)
    expect(sql).toContain('1 = 0')
    expect(sql).not.toContain('b.id IN')
  })

  it('can require documents to already have validation status', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({
      requireValidationStatus: true,
    })

    expect(queryText(0)).toContain('dq.validation_status IS NOT NULL')
  })
})

// ---------------------------------------------------------------------------
// getDocuments — mocks Prisma
// ---------------------------------------------------------------------------
describe('getNeedsReviewDocuments', () => {
  const defaultRow = {
    id: 'doc-1',
    filesize: null,
    hash_binary: null,
    hash_content: null,
    id_legacy: null,
    source_id: null,
    name: null,
    validation_status: 'NEEDS_REVIEW',
    created_at: null,
    updated_at: null,
    is_duplicate: 0,
    sort_value: null,
  }

  beforeEach(() => {
    mockDocumentMetadataFindMany.mockResolvedValue([])
  })

  afterEach(() => {
    mockQueryRaw.mockReset()
    mockDocumentMetadataFindMany.mockReset()
  })

  it('uses an inner join to document_quality with the default review queue status scope', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getNeedsReviewDocuments()

    const sql = queryText(0)
    expect(sql).toContain('INNER JOIN document_quality dq ON dq.document_id = d.id')
    expect(sql).toContain("LOWER(COALESCE(dq.validation_status, '')) IN")
    expect(queryCall(0).values).toContain('needs_review')
    expect(queryCall(0).values).toContain('metadata_issues')
    expect(queryCall(0).values).toContain('format_errors')
  })

  it('narrows review queue queries to an explicit approved status subset', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getNeedsReviewDocuments({
      statuses: ['FORMAT_ERRORS'],
    })

    expect(queryCall(0).values).toContain('format_errors')
    expect(queryCall(0).values).not.toContain('needs_review')
    expect(queryCall(0).values).not.toContain('metadata_issues')
  })

  it('falls back to the default review queue scope when given statuses outside the approved slice', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getNeedsReviewDocuments({
      statuses: ['APPROVED'],
    })

    expect(queryCall(0).values).toContain('needs_review')
    expect(queryCall(0).values).toContain('metadata_issues')
    expect(queryCall(0).values).toContain('format_errors')
    expect(queryCall(0).values).not.toContain('approved')
  })

  it('preserves cursor pagination and sort order behavior', async () => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])

    const result = await getNeedsReviewDocuments({
      page: 1,
      pageSize: 25,
      orderBy: 'created_at',
      sortDirection: 'desc',
    })

    expect(result.data).toHaveLength(1)
    expect(result.pageInfo.page).toBe(1)
    expect(queryText(0)).toContain("ORDER BY COALESCE(d.created_at, TIMESTAMP('1000-01-01 00:00:00')) DESC, d.id ASC")
  })

  it('maps validator fields for review queue documents', async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        ...defaultRow,
        validation_timestamp: BigInt(1747094400),
        validator_name: 'Maria Reviewer',
        validation_comment: 'Needs a second look.',
        validation_comment_additional: 'Check the appendix pages.',
      },
    ])

    const result = await getNeedsReviewDocuments()

    expect(result.data[0]?.validation_timestamp).toBe(1747094400)
    expect(result.data[0]?.validator_name).toBe('Maria Reviewer')
    expect(result.data[0]?.validation_comment).toBe('Needs a second look.')
    expect(result.data[0]?.validation_comment_additional).toBe('Check the appendix pages.')
  })

  it('hydrates needs-review reasons in one metadata query for the returned page', async () => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])
    mockDocumentMetadataFindMany.mockResolvedValueOnce([
      {
        document_id: 'doc-1',
        value: JSON.stringify({
          value: {
            document_splitter_1: ['Boundary requires review.'],
          },
        }),
      },
    ])

    const result = await getNeedsReviewDocuments()

    expect(result.data[0]?.needs_review_reasons).toEqual([
      {
        serviceKey: 'document_splitter_1',
        serviceLabel: 'Document Splitter Pass 1',
        reasons: ['Boundary requires review.'],
      },
    ])
    expect(mockDocumentMetadataFindMany).toHaveBeenCalledTimes(1)
    expect(mockDocumentMetadataFindMany).toHaveBeenCalledWith({
      where: {
        document_id: { in: ['doc-1'] },
        metadata: { name: 'needs_review' },
      },
      select: { document_id: true, value: true },
    })
  })

  it('does not hydrate reason metadata for the count query', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }])

    await getNeedsReviewDocumentsCount()

    expect(mockDocumentMetadataFindMany).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// getDocuments â€” mocks Prisma
// ---------------------------------------------------------------------------
describe('getDocuments', () => {
  const defaultRow = {
    id: 'doc-1',
    filesize: null,
    hash_binary: null,
    hash_content: null,
    id_legacy: null,
    source_id: null,
    name: null,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: null,
    is_duplicate: 0,
  }

  beforeAll(() => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])
  })

  afterEach(() => {
    mockQueryRaw.mockReset()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('uses PAGE_SIZE of 20', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getDocuments({ page: 2 })

    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(21)
  })

  it('orders by created_at desc', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getDocuments()

    expect(queryText(0)).toContain("ORDER BY COALESCE(d.created_at, TIMESTAMP('1000-01-01 00:00:00')) DESC, d.id ASC")
  })

  it('returns items array and total count', async () => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])

    const result = await getDocuments()

    expect(result).toHaveProperty('items')
    expect(result).toHaveProperty('total')
    expect(Array.isArray(result.items)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Normalize page number edge cases
// ---------------------------------------------------------------------------
describe('page number normalization', () => {
  beforeAll(() => {
    mockQueryRaw.mockResolvedValueOnce([])
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('normalizes page < 1 to 1', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({ page: 0 })
    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })

  it('normalizes negative page to 1', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({ page: -5 })
    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })

  it('normalizes NaN page to 1', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({ page: NaN })
    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })
})
