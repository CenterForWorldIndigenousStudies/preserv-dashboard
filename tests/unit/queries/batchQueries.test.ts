import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Prisma } from '@lib/prisma/generated/client'

const { mockBatchesCount, mockBatchesFindMany, mockBatchesFindUnique, mockTagsFindMany } = vi.hoisted(() => ({
  mockBatchesCount: vi.fn(),
  mockBatchesFindMany: vi.fn(),
  mockBatchesFindUnique: vi.fn(),
  mockTagsFindMany: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    batches: {
      count: mockBatchesCount,
      findMany: mockBatchesFindMany,
      findUnique: mockBatchesFindUnique,
    },
    tags: {
      findMany: mockTagsFindMany,
    },
  },
}))

import { getBatchDetail, getBatchOverviewMetrics, getBatches, parseBatchQueryParams } from '@lib/queries/batchQueries'
import type { BatchDetail, BatchListItem } from 'types/batches'

describe('batch query contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes batch table query parameters', () => {
    expect(
      parseBatchQueryParams({
        page: '2',
        pageSize: '50',
        search: '  batch-1  ',
        orderBy: 'startedAt',
        sortDirection: 'desc',
        cursorValue: '2026-07-09T00:00:00.000Z',
        cursorId: 'batch-1',
        cursorDirection: 'next',
      }),
    ).toEqual({
      page: 2,
      pageSize: 50,
      search: 'batch-1',
      orderBy: 'startedAt',
      sortDirection: 'desc',
      cursorValue: '2026-07-09T00:00:00.000Z',
      cursorId: 'batch-1',
      cursorDirection: 'next',
      filters: {
        author: undefined,
        tag: undefined,
        statuses: undefined,
        documentType: undefined,
        batch: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        collection: undefined,
        accessLevel: undefined,
      },
    })
  })

  it('normalizes Advanced Search parameters for batch queries', () => {
    expect(
      parseBatchQueryParams({
        author: ' Ada ',
        tag: ' refuge ',
        statuses: 'APPROVED,REJECTED',
        documentType: 'duplicate',
        batch: 'Special_RCR',
        createdFrom: '2026-01-01',
        createdTo: '2026-01-31',
        collection: 'Collection A',
        accessLevel: 'PUBLIC',
      }).filters,
    ).toEqual({
      author: 'Ada',
      tag: 'refuge',
      statuses: ['APPROVED', 'REJECTED'],
      documentType: 'duplicate',
      batch: 'Special_RCR',
      createdFrom: '2026-01-01',
      createdTo: '2026-01-31',
      collection: 'Collection A',
      accessLevel: 'public',
    })
  })

  it('builds document-membership predicates for Advanced Search filters', async () => {
    mockBatchesFindMany.mockResolvedValue([])
    mockBatchesCount.mockResolvedValue(0)

    await getBatches({
      page: 1,
      pageSize: 25,
      filters: {
        author: 'Ada',
        statuses: ['APPROVED'],
        documentType: 'duplicate',
        createdFrom: '2026-01-01',
        createdTo: '2026-01-31',
        collection: 'Collection A',
        accessLevel: 'public',
      },
    })

    const findManyCall = mockBatchesFindMany.mock.calls[0]?.[0] as unknown as {
      where: Prisma.batchesWhereInput
    }
    const where = findManyCall.where
    const batchDocumentCondition = where as Prisma.batchesWhereInput & {
      document_to_batches: { some: { documents: Prisma.documentsWhereInput } }
    }
    const documentsWhere = batchDocumentCondition.document_to_batches.some.documents
    const documentConditions = (documentsWhere as Prisma.documentsWhereInput & {
      AND: Prisma.documentsWhereInput[]
    }).AND

    expect(documentConditions).toHaveLength(6)
    expect(documentConditions).toContainEqual({ document_quality: { validation_status: { in: ['APPROVED'] } } })
    const conditionKeys = (documentConditions as unknown as Record<string, unknown>[])
      .map((condition) => Object.keys(condition)[0] ?? '')
      .sort()
    expect(conditionKeys).toEqual([
      'created_at',
      'document_access',
      'document_to_authors',
      'document_to_tags',
      'document_quality',
      'document_to_tags',
    ].sort())
    expect(batchDocumentCondition.document_to_batches).toEqual({ some: { documents: documentsWhere } })
  })

  it('limits batches to fuzzy batch matches', async () => {
    mockBatchesFindMany.mockResolvedValueOnce([{ id: 'batch-1', name: 'Special RCR Writings' }]).mockResolvedValueOnce([])
    mockBatchesCount.mockResolvedValue(0)

    await getBatches({
      page: 1,
      pageSize: 25,
      filters: { batch: 'special rcr' },
    })

    const findManyCall = mockBatchesFindMany.mock.calls[1]?.[0] as unknown as {
      where: Prisma.batchesWhereInput
    }
    expect(findManyCall.where).toEqual({ id: { in: ['batch-1'] } })
  })

  it('makes an unmatched fuzzy tag filter return no batches', async () => {
    mockTagsFindMany.mockResolvedValue([])
    mockBatchesFindMany.mockResolvedValue([])
    mockBatchesCount.mockResolvedValue(0)

    await getBatches({
      page: 1,
      pageSize: 25,
      filters: { tag: 'missing' },
    })

    const findManyCall = mockBatchesFindMany.mock.calls[0]?.[0] as unknown as {
      where: Prisma.batchesWhereInput
    }
    const batchDocumentCondition = findManyCall.where as Prisma.batchesWhereInput & {
      document_to_batches: { some: { documents: Prisma.documentsWhereInput } }
    }
    const documentsWhere = batchDocumentCondition.document_to_batches.some.documents as Prisma.documentsWhereInput & {
      AND: Prisma.documentsWhereInput[]
    }
    expect(documentsWhere.AND).toContainEqual({
      document_to_tags: { some: { tag_id: { in: [] } } },
    })
  })

  it('calculates overview metrics from the filtered batch set', async () => {
    mockBatchesFindMany.mockResolvedValue([
      {
        id: 'batch-1',
        name: 'Matching Batch',
        id_legacy: null,
        started_at: null,
        processing_details: JSON.stringify({ total_documents: 3 }),
        document_to_batches: [{ cost: 0, processing_time_seconds: null }],
      },
    ])
    mockBatchesCount.mockResolvedValue(1)

    await expect(
      getBatchOverviewMetrics({ page: 1, pageSize: 25, filters: { author: 'Ada' } }),
    ).resolves.toEqual({ totalBatches: 1, totalDocuments: 3 })
  })

  it('maps a batch to a display-ready list item', async () => {
    mockBatchesCount.mockResolvedValue(1)
    mockBatchesFindMany.mockResolvedValue([
      {
        id: 'batch-1',
        name: 'Batch One',
        id_legacy: 'LEGACY-BATCH-1',
        started_at: new Date('2026-07-09T00:00:00.000Z'),
        processing_details: JSON.stringify({ total_documents: 5, batch_statistics: { speed: 42 } }),
        document_to_batches: [
          { cost: 10.25, processing_time_seconds: 20 },
          { cost: 2.25, processing_time_seconds: 22 },
        ],
      },
    ])

    const result = await getBatches({ page: 1, pageSize: 25, filters: {} })

    const expected: BatchListItem = {
      id: 'batch-1',
      name: 'Batch One',
      idLegacy: 'LEGACY-BATCH-1',
      startedAt: new Date('2026-07-09T00:00:00.000Z'),
      documentCount: 5,
      totalCost: '$12.50',
      processingTime: 42,
    }

    expect(result.data).toEqual([expected])
    expect(result.totalCount).toBe(1)
    expect(result.pageInfo).toMatchObject({ pageSize: 25, hasNextPage: false, hasPreviousPage: false })
  })

  it('searches batch names, IDs, and legacy IDs', async () => {
    mockBatchesCount.mockResolvedValue(0)
    mockBatchesFindMany.mockResolvedValue([])

    await getBatches({ page: 1, pageSize: 25, search: 'Special batch', filters: {} })

    expect(mockBatchesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { id: { contains: 'Special batch' } },
            { name: { contains: 'Special batch' } },
            { id_legacy: { contains: 'Special batch' } },
          ],
        },
      }),
    )
  })

  it('maps nested processing details for an existing batch', async () => {
    mockBatchesFindUnique.mockResolvedValue({
      id: 'batch-1',
      name: 'Batch One',
      id_legacy: null,
      started_by: 'mary@example.org',
      started_at: new Date('2026-07-09T00:00:00.000Z'),
      processing_details: JSON.stringify({
        total_documents: 5,
        batch_statistics: { speed: 42, units: 'documents/second' },
        sources: ['drive-a', 'drive-b'],
      }),
      document_to_batches: [{ cost: 12.5, processing_time_seconds: 42 }],
    })

    const result = await getBatchDetail('batch-1')

    const expected: BatchDetail = {
      id: 'batch-1',
      name: 'Batch One',
      startedBy: 'mary@example.org',
      startedAt: new Date('2026-07-09T00:00:00.000Z'),
      properties: [
        { key: 'total_documents', value: 5 },
        { key: 'batch_statistics', value: { speed: 42, units: 'documents/second' } },
        { key: 'sources', value: ['drive-a', 'drive-b'] },
        { key: 'Total Cost', value: '$12.50' },
        { key: 'Processing Time (seconds)', value: 42 },
      ],
    }

    expect(result).toEqual(expected)
  })

  it('returns no properties for malformed processing details', async () => {
    mockBatchesFindUnique.mockResolvedValue({
      id: 'batch-1',
      name: null,
      started_at: null,
      processing_details: '{invalid json',
      document_to_batches: [],
    })

    const result = await getBatchDetail('batch-1')

    expect(result?.properties).toEqual([
      { key: 'Total Cost', value: '$0.00' },
      { key: 'Processing Time (seconds)', value: 'Unknown' },
    ])
  })

  it('returns null for an unknown batch', async () => {
    mockBatchesFindUnique.mockResolvedValue(null)

    await expect(getBatchDetail('missing-batch')).resolves.toBeNull()
  })

  it('returns overview metrics from batch associations', async () => {
    mockBatchesFindMany.mockResolvedValue([
      {
        id: 'batch-1',
        name: 'Batch One',
        id_legacy: null,
        started_at: null,
        processing_details: JSON.stringify({ total_documents: 3 }),
        document_to_batches: [{ cost: 0, processing_time_seconds: null }, {}, {}],
      },
      {
        id: 'batch-2',
        name: 'Batch Two',
        id_legacy: null,
        started_at: null,
        processing_details: JSON.stringify({}),
        document_to_batches: [{ cost: 0, processing_time_seconds: null }],
      },
    ])

    await expect(getBatchOverviewMetrics()).resolves.toEqual({ totalBatches: 2, totalDocuments: 4 })
  })
})
