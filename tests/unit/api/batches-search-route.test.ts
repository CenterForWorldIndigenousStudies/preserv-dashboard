import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockBatchesFindMany, mockBatchesFindFirst } = vi.hoisted(() => ({
  mockBatchesFindMany: vi.fn(),
  mockBatchesFindFirst: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    batches: {
      findMany: mockBatchesFindMany,
      findFirst: mockBatchesFindFirst,
    },
  },
}))

import { GET } from '@api/batches/search/route'

describe('batch search route', () => {
  it('returns empty results for an empty query', async () => {
    const response = await GET(new NextRequest('http://localhost/api/batches/search'))
    const payload = (await response.json()) as { batches: unknown[]; exactMatch: unknown }

    expect(response.status).toBe(200)
    expect(payload).toEqual({ batches: [], exactMatch: null })
    expect(mockBatchesFindMany).not.toHaveBeenCalled()
    expect(mockBatchesFindFirst).not.toHaveBeenCalled()
  })

  it('returns ranked suggestions and an exact match independently', async () => {
    mockBatchesFindMany.mockResolvedValue([
      { id: 'batch-other', name: 'Coastal Fisheries' },
      { id: 'batch-special', name: 'Special RCR Writings September 25 2025' },
    ])
    mockBatchesFindFirst.mockResolvedValue({
      id: 'batch-special',
      name: 'Special RCR Writings September 25 2025',
    })

    const response = await GET(
      new NextRequest(
        'http://localhost/api/batches/search?query=Special%20RCR%20Writings%20September%2025%202025&limit=1',
      ),
    )
    const payload = (await response.json()) as {
      batches: Array<{ id: string; name: string; score: number }>
      exactMatch: { id: string; name: string; score: number } | null
    }

    expect(response.status).toBe(200)
    expect(payload.batches).toHaveLength(1)
    expect(payload.batches[0]).toMatchObject({ id: 'batch-special' })
    expect(payload.exactMatch).toMatchObject({
      id: 'batch-special',
      name: 'Special RCR Writings September 25 2025',
    })
    expect(payload.exactMatch?.score).toBeGreaterThan(0)
  })

  it('returns a server error when the database search fails', async () => {
    mockBatchesFindMany.mockRejectedValue(new Error('database unavailable'))

    const response = await GET(new NextRequest('http://localhost/api/batches/search?query=batch'))
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(500)
    expect(payload.error).toBe('database unavailable')
  })
})
