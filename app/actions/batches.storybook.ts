import type { BatchListPageResult, BatchTableQuery } from 'types/batches'

export function getBatchesAction(_query: BatchTableQuery): Promise<BatchListPageResult> {
  return Promise.resolve({
    data: [],
    totalCount: 0,
    pageInfo: {
      pageSize: 25,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  })
}
