import { describe, expect, it } from 'vitest'

import { isLikelyGoogleDriveId } from '@lib/google'

describe('isLikelyGoogleDriveId', () => {
  it('returns false for readable slugs that are not Drive ids', () => {
    expect(isLikelyGoogleDriveId('not-a-drive-id')).toBe(false)
  })

  it('returns true for likely Drive ids', () => {
    expect(isLikelyGoogleDriveId('1poTSVemTJceJNCqWlhzNuUnrO4oX21Dy')).toBe(true)
  })
})
