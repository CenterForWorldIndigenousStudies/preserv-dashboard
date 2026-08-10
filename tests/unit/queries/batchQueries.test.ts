import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockBatchesCount, mockBatchesFindMany, mockBatchesFindUnique } = vi.hoisted(() => ({
  mockBatchesCount: vi.fn(),
  mockBatchesFindMany: vi.fn(),
  mockBatchesFindUnique: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    batches: {
      count: mockBatchesCount,
      findMany: mockBatchesFindMany,
      findUnique: mockBatchesFindUnique,
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
      filters: {},
    })
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
    mockBatchesFindMany.mockResolvedValue([{ document_to_batches: [{}, {}, {}] }, { document_to_batches: [{}] }])

    await expect(getBatchOverviewMetrics()).resolves.toEqual({ totalBatches: 2, totalDocuments: 4 })
  })
})
