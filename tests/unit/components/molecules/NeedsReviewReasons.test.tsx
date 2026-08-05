import React from 'react'
import { describe, expect, it } from 'vitest'

import { NeedsReviewReasons } from '../../../../components/molecules/NeedsReviewReasons'

describe('NeedsReviewReasons', () => {
  it('does not pass theme callback props across the server component boundary', () => {
    const element = NeedsReviewReasons({ value: { validation: ['Approved'] } }) as React.ReactElement<{
      sx?: unknown
    }>

    expect(typeof element.props.sx).not.toBe('function')
  })
})
