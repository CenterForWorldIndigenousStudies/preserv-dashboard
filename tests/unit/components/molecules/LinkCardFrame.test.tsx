import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { LinkCardFrame } from '@molecules/LinkCardFrame'

describe('LinkCardFrame', () => {
  it('renders shared eyebrow, body content, and the link action', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <LinkCardFrame
          actionLabel="Open"
          eyebrow="Shared Label"
          href="/review-queue"
          title="Shared Title"
        >
          <span>Shared Body</span>
        </LinkCardFrame>
      </ThemeProvider>,
    )

    expect(markup).toContain('Shared Label')
    expect(markup).toContain('Shared Title')
    expect(markup).toContain('Shared Body')
    expect(markup).toContain('/review-queue')
    expect(markup).toContain('Open')
  })
})
