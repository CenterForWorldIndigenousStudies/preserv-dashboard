import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { SidebarHeader } from '@atoms/SidebarHeader'

describe('SidebarHeader', () => {
  it('renders the title text', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarHeader title="Preservation Pipeline" />
      </ThemeProvider>,
    )

    expect(markup).toContain('Preservation Pipeline')
  })

  it('renders the optional action slot when provided', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarHeader
          title="Preservation Pipeline"
          action={<button aria-label="Close navigation menu">Close</button>}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Close navigation menu')
    expect(markup).toContain('Close')
  })
})
