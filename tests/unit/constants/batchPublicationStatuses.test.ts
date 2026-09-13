import { describe, expect, it } from 'vitest'

import contract from '@contracts/batch-publication-statuses.json'
import * as batchPublicationStatuses from '@constants/batchPublicationStatuses'
import { GENERATED_BATCH_PUBLICATION_STATUSES } from '@constants/generated/batchPublicationStatuses'

describe('batch publication status contract', () => {
  it('matches the synced publication-status contract', () => {
    expect(GENERATED_BATCH_PUBLICATION_STATUSES).toEqual(contract)
  })

  it('exposes stable publication-status values', () => {
    expect(Object.values(GENERATED_BATCH_PUBLICATION_STATUSES)).toEqual([
      'not_started',
      'publication_locked',
      'published',
      'unknown',
    ])
  })

  it('does not duplicate the generated runtime constant', () => {
    expect('BATCH_PUBLICATION_STATUSES' in batchPublicationStatuses).toBe(false)
  })
})
