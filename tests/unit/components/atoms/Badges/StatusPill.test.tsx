import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StatusPill, statusVariantMap } from '@atoms/Badges/StatusPill'

describe('StatusPill', () => {
  it('humanizes underscore-delimited statuses', () => {
    const markup = renderToStaticMarkup(<StatusPill status={'NEEDS_REVIEW'} />)

    expect(markup).toContain('Needs Review')
    expect(markup).not.toContain('NEEDS_REVIEW')
    expect(markup).toContain('text-transform:none')
  })

  it('keeps needs-review status styling when a caller supplies a conflicting variant', () => {
    const markup = renderToStaticMarkup(<StatusPill status={'NEEDS_REVIEW'} variant={'danger'} />)

    expect(statusVariantMap.needs_review).toBe('info')
    expect(markup).toContain('background-color:rgba(2, 136, 209, 1)')
    expect(markup).not.toContain('background-color:rgba(211, 47, 47, 0.15)')
  })
})
