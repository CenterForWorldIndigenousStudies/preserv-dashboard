import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { KeyValueRow } from '../../../../components/molecules/KeyValueRow'

function TestValue() {
  return React.createElement('span', null, 'May 19, 2026')
}

describe('KeyValueRow', () => {
  it('renders React element values directly', () => {
    const markup = renderToStaticMarkup(
      React.createElement(KeyValueRow, {
        label: 'Started At',
        value: React.createElement(TestValue),
      })
    )

    expect(markup).toContain('Started At')
    expect(markup).toContain('May 19, 2026')
    expect(markup).not.toContain('[complex value]')
  })
})
