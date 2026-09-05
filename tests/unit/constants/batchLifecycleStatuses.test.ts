import { describe, expect, it } from 'vitest'

import contract from '@contracts/batch-lifecycle-statuses.json'
import { BATCH_LIFECYCLE_STATUSES } from '@constants/batchLifecycleStatuses'

describe('batch lifecycle status contract', () => {
  it('matches the synced lifecycle contract', () => {
    expect(BATCH_LIFECYCLE_STATUSES).toEqual(contract)
  })

  it('exposes stable lifecycle values', () => {
    expect(Object.values(BATCH_LIFECYCLE_STATUSES)).toEqual([
      'draft',
      'queued',
      'running',
      'failed',
      'publication_locked',
      'complete',
      'archive',
      'rollback_requested',
      'draining',
      'reverting',
      'rollback_failed',
      'reverted',
    ])
  })
})
