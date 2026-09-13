import { describe, expect, it } from 'vitest'

import { getDocumentEditWarning } from '@lib/documentEditAccess'

describe('getDocumentEditWarning', () => {
  it('warns when an approved document is opened for editing', () => {
    expect(getDocumentEditWarning({ validationStatus: 'APPROVED', hasPublishedBatch: false })).toBe('approved')
  })

  it('uses the published warning when a document is both approved and published', () => {
    expect(getDocumentEditWarning({ validationStatus: 'APPROVED', hasPublishedBatch: true, latestState: null })).toBe(
      'published',
    )
  })

  it('uses the published warning for documents in the library state', () => {
    expect(
      getDocumentEditWarning({
        validationStatus: 'APPROVED',
        hasPublishedBatch: false,
        latestState: 'ingested_fedora',
      }),
    ).toBe('published')
  })

  it('does not warn for documents that are neither approved nor published', () => {
    expect(
      getDocumentEditWarning({ validationStatus: 'NEEDS_REVIEW', hasPublishedBatch: false, latestState: null }),
    ).toBeNull()
  })
})
