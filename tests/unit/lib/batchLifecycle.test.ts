import { describe, expect, it } from 'vitest'

import {
  canRequestBatchRollback,
  isBatchPublicationLocked,
  isBatchPublished,
} from '@lib/batchLifecycle'

describe('batch lifecycle helpers', () => {
  it('uses lifecycle status as the authority for publication and rollback decisions', () => {
    expect(canRequestBatchRollback('running')).toBe(true)
    expect(canRequestBatchRollback('publication_locked')).toBe(false)
    expect(isBatchPublicationLocked('publication_locked')).toBe(true)
    expect(isBatchPublicationLocked('published')).toBe(false)
    expect(isBatchPublished('published')).toBe(true)
    expect(isBatchPublished('complete')).toBe(false)
  })
})
