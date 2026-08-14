import { describe, expect, it } from 'vitest'

import contract from '@contracts/document-states.json'
import { DOCUMENT_STATES } from '@constants/documentStates'

describe('document state contract', () => {
  it('matches the synced document state contract', () => {
    expect(DOCUMENT_STATES).toEqual(contract)
  })

  it('exposes needs_review instead of under_review', () => {
    expect(DOCUMENT_STATES.NEEDS_REVIEW).toBe('needs_review')
    expect('UNDER_REVIEW' in DOCUMENT_STATES).toBe(false)
  })
})
