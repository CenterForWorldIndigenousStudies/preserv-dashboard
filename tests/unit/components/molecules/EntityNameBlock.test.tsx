import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EntityNameBlock } from '@molecules/EntityNameBlock'

describe('EntityNameBlock', () => {
  it('renders a configurable fallback, compact identity, legacy identity, and status content', () => {
    const markup = renderToStaticMarkup(
      <EntityNameBlock
        name={null}
        id={'12345678-90ab-cdef-1234-567890abcdef'}
        legacyId={'LEGACY-BATCH-1'}
        fallbackName={'Untitled batch'}
        badges={<span>{'Batch status'}</span>}
      />,
    )

    expect(markup).toContain('Untitled batch')
    expect(markup).not.toContain('Untitled document')
    expect(markup).toContain('ID 12345678')
    expect(markup).toContain('Legacy LEGACY-BATCH-1')
    expect(markup).toContain('Batch status')
  })
})
