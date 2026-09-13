import { describe, expect, it } from 'vitest'

import contract from '@contracts/batch-lifecycle-statuses.json'
import * as batchLifecycleStatuses from '@constants/batchLifecycleStatuses'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'

describe('batch lifecycle status contract', () => {
  it('matches the synced lifecycle contract', () => {
    expect(GENERATED_BATCH_LIFECYCLE_STATUSES).toEqual(contract)
  })

  it('exposes stable lifecycle values', () => {
    expect(Object.values(GENERATED_BATCH_LIFECYCLE_STATUSES)).toEqual([
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

  it('does not duplicate the generated runtime constant', () => {
    expect('BATCH_LIFECYCLE_STATUSES' in batchLifecycleStatuses).toBe(false)
  })
})
