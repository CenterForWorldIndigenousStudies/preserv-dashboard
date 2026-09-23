import { describe, expect, it } from 'vitest'

import { BATCH_ROLLBACK_STATUSES } from '@constants/batchRollbackStatuses'

describe('batch rollback statuses', () => {
  it('defines the rollback operation states', () => {
    expect(BATCH_ROLLBACK_STATUSES).toEqual({
      REQUESTED: 'requested',
      DRAINING: 'draining',
      ROLLBACK_IN_PROGRESS: 'rollback_in_progress',
      FAILED: 'failed',
      ROLLED_BACK: 'rolled_back',
    })
  })
})
