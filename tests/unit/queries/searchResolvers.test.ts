import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockTagsFindMany, mockBatchesFindMany } = vi.hoisted(() => ({
  mockTagsFindMany: vi.fn(),
  mockBatchesFindMany: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    tags: { findMany: mockTagsFindMany },
    batches: { findMany: mockBatchesFindMany },
  },
}))

import {
  resolveBatchSearchIds,
  resolveTagSearchIds,
  type SearchQueryDbClient,
} from '@lib/queries/searchResolvers'

const client = {
  tags: { findMany: mockTagsFindMany },
  batches: { findMany: mockBatchesFindMany },
} as unknown as SearchQueryDbClient

describe('search query resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves tag terms through bounded fuzzy candidates', async () => {
    mockTagsFindMany.mockResolvedValue([
      { id: 'tag-1', name: 'Refugee Mental Health', notes: null },
      { id: 'tag-2', name: 'Unrelated Tag', notes: null },
    ])

    await expect(resolveTagSearchIds('refugee', client)).resolves.toEqual(['tag-1'])
    const findManyCall = mockTagsFindMany.mock.calls[0]?.[0] as unknown as {
      orderBy: { name: string }
      take: number
    }
    expect(findManyCall.orderBy).toEqual({ name: 'asc' })
    expect(findManyCall.take).toBe(5000)
  })

  it('returns no matches for a non-empty tag term without fuzzy matches', async () => {
    mockTagsFindMany.mockResolvedValue([])

    await expect(resolveTagSearchIds('missing', client)).resolves.toEqual([])
  })

  it('returns no filter for an absent tag term', async () => {
    await expect(resolveTagSearchIds(undefined, client)).resolves.toBeUndefined()
    expect(mockTagsFindMany).not.toHaveBeenCalled()
  })

  it('resolves batch terms through bounded fuzzy candidates', async () => {
    mockBatchesFindMany.mockResolvedValue([
      { id: 'batch-1', name: 'Special RCR Writings' },
      { id: 'batch-2', name: 'Unrelated Batch' },
    ])

    await expect(resolveBatchSearchIds('special rcr', client)).resolves.toEqual(['batch-1'])
    const findManyCall = mockBatchesFindMany.mock.calls[0]?.[0] as unknown as {
      orderBy: { name: string }
      take: number
    }
    expect(findManyCall.orderBy).toEqual({ name: 'asc' })
    expect(findManyCall.take).toBe(5000)
  })

  it('prefers an exact batch name over fuzzy near-matches', async () => {
    mockBatchesFindMany.mockResolvedValue([
      { id: 'batch-matching', name: 'Matching Batch Filter Integration' },
      { id: 'batch-other', name: 'Other Batch Filter Integration' },
    ])

    await expect(resolveBatchSearchIds('Matching Batch Filter Integration', client)).resolves.toEqual([
      'batch-matching',
    ])
  })
})
