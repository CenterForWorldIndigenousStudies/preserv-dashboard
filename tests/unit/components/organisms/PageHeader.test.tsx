import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PageHeader } from '@organisms/PageHeader'

describe('PageHeader', () => {
  it('renders the page information button at the top right', () => {
    const markup = renderToStaticMarkup(
      <PageHeader
        eyebrow={'Collections'}
        title={'Collection Details'}
        description={'Manage this collection.'}
        infoTitle={'About collections'}
        infoContent={<p>Collections group documents for discovery.</p>}
      />,
    )

    expect(markup).toContain('aria-label="Page information"')
    expect(markup).toContain('width:80px')
    expect(markup).toContain('height:80px')
  })

  it('opens the supplied page information in the shared modal', () => {
    const markup = renderToStaticMarkup(
      <PageHeader
        eyebrow={'Collections'}
        title={'Collection Details'}
        description={'Manage this collection.'}
        infoTitle={'About collections'}
        infoContent={<p>Collections group documents for discovery.</p>}
      />,
    )

    expect(markup).toContain('aria-label="Page information"')
  })
})
