import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetBatches } = vi.hoisted(() => ({
  mockGetBatches: vi.fn(),
}))

vi.mock('@lib/queries/batchQueries', () => ({
  getBatches: mockGetBatches,
}))

import { getBatchesAction } from '@actions/batches'

describe('batch actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards the batch table query to the batch query module', async () => {
    const query = { page: 1, pageSize: 25, search: 'batch', filters: {} }
    const result = {
      data: [],
      totalCount: 0,
      pageInfo: { pageSize: 25, hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
    }
    mockGetBatches.mockResolvedValue(result)

    await expect(getBatchesAction(query)).resolves.toEqual(result)
    expect(mockGetBatches).toHaveBeenCalledWith(query)
  })
})
