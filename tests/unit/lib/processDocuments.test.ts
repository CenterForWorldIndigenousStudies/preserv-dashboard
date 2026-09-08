import { describe, expect, it } from 'vitest'

import { upsertBatchStatus } from '@lib/processDocuments'
import { createProcessBatch } from '@molecules/processStoryFixtures'

describe('upsertBatchStatus', () => {
  it('keeps only the three newest batches after adding a launch', () => {
    const existingBatches = ['batch-2', 'batch-3', 'batch-4'].map((batchId) =>
      createProcessBatch({ batchId }),
    )

    const result = upsertBatchStatus(existingBatches, createProcessBatch({ batchId: 'batch-1' }))

    expect(result.map((batch) => batch.batchId)).toEqual(['batch-1', 'batch-2', 'batch-3'])
  })
})
