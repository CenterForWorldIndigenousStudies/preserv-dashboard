import { describe, expect, it } from 'vitest'

import contract from '@contracts/document-states.json'
import * as documentStates from '@constants/documentStates'
import { GENERATED_DOCUMENT_STATES } from '@constants/generated/documentStates'

describe('document state contract', () => {
  it('matches the synced document state contract', () => {
    expect(GENERATED_DOCUMENT_STATES).toEqual(contract)
  })

  it('does not duplicate the generated runtime constant', () => {
    expect('DOCUMENT_STATES' in documentStates).toBe(false)
  })
})
