'use server'

import { getBatches } from '@lib/queries/batchQueries'
import type { BatchListPageResult, BatchTableQuery } from 'types/batches'

export async function getBatchesAction(query: BatchTableQuery): Promise<BatchListPageResult> {
  return getBatches(query)
}
