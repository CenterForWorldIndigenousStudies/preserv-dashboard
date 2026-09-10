import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import Loading from '@root/app/loading'

describe('dashboard loading state', () => {
  it('marks the spinner for viewport centering without adding a wrapper', () => {
    const markup = renderToStaticMarkup(<Loading />)

    expect(markup).toContain('loading-indicator')
  })
})
