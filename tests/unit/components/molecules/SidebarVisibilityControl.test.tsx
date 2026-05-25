import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

describe('SidebarVisibilityControl', () => {
  it('renders the mobile open control label', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarVisibilityControl intent="open" surface="mobileBar" onClick={() => {}} />
      </ThemeProvider>,
    )

    expect(markup).toContain('aria-label="Open navigation menu"')
    expect(markup).toContain('title="Open navigation menu"')
  })

  it('renders the mobile close control label', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarVisibilityControl intent="close" surface="sidebarHeader" onClick={() => {}} />
      </ThemeProvider>,
    )

    expect(markup).toContain('aria-label="Close navigation menu"')
    expect(markup).toContain('title="Close navigation menu"')
  })

  it('renders the desktop close control label and title', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarVisibilityControl intent="close" surface="desktopRail" onClick={() => {}} />
      </ThemeProvider>,
    )

    expect(markup).toContain('aria-label="Hide sidebar"')
    expect(markup).toContain('title="Hide sidebar"')
  })

  it('renders the desktop open control label and title', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarVisibilityControl intent="open" surface="desktopRail" onClick={() => {}} />
      </ThemeProvider>,
    )

    expect(markup).toContain('aria-label="Show sidebar"')
    expect(markup).toContain('title="Show sidebar"')
  })
})
