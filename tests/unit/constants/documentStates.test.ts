import { describe, expect, it } from 'vitest'

import contract from '@contracts/document-states.json'
import { DOCUMENT_STATES } from '@constants/documentStates'

describe('document state contract', () => {
  it('matches the synced document state contract', () => {
    expect(DOCUMENT_STATES).toEqual(contract)
  })
})
