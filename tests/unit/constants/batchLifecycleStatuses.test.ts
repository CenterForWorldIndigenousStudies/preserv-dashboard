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
      'complete',
      'published',
      'failed',
      'publication_locked',
      'archive',
      'rollback_requested',
      'draining',
      'rollback_in_progress',
      'rollback_failed',
      'rolled_back',
    ])
  })

  it('does not duplicate the generated runtime constant', () => {
    expect('BATCH_LIFECYCLE_STATUSES' in batchLifecycleStatuses).toBe(false)
  })
})
