import { describe, expect, it } from 'vitest'

import contract from '@contracts/batch-publication-statuses.json'
import { BATCH_PUBLICATION_STATUSES } from '@constants/batchPublicationStatuses'

describe('batch publication status contract', () => {
  it('matches the synced publication-status contract', () => {
    expect(BATCH_PUBLICATION_STATUSES).toEqual(contract)
  })

  it('exposes stable publication-status values', () => {
    expect(Object.values(BATCH_PUBLICATION_STATUSES)).toEqual([
      'not_started',
      'publication_locked',
      'published',
      'unknown',
    ])
  })
})
