import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { SIDEBAR_CONTROL_LABELS } from '@constants/sidebar'
import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

describe('SidebarVisibilityControl', () => {
  it('renders the mobile open control label', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarVisibilityControl intent="open" surface="mobileBar" onClick={() => {}} />
      </ThemeProvider>,
    )

    expect(markup).toContain(`aria-label="${SIDEBAR_CONTROL_LABELS.openNavigation}"`)
    expect(markup).toContain(`title="${SIDEBAR_CONTROL_LABELS.openNavigation}"`)
  })

  it('renders the mobile close control label', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarVisibilityControl intent="close" surface="sidebarHeader" onClick={() => {}} />
      </ThemeProvider>,
    )

    expect(markup).toContain(`aria-label="${SIDEBAR_CONTROL_LABELS.closeNavigation}"`)
    expect(markup).toContain(`title="${SIDEBAR_CONTROL_LABELS.closeNavigation}"`)
  })

  it('renders the desktop close control label and title', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarVisibilityControl intent="close" surface="desktopRail" onClick={() => {}} />
      </ThemeProvider>,
    )

    expect(markup).toContain(`aria-label="${SIDEBAR_CONTROL_LABELS.hideSidebar}"`)
    expect(markup).toContain(`title="${SIDEBAR_CONTROL_LABELS.hideSidebar}"`)
  })

  it('renders the desktop open control label and title', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarVisibilityControl intent="open" surface="desktopRail" onClick={() => {}} />
      </ThemeProvider>,
    )

    expect(markup).toContain(`aria-label="${SIDEBAR_CONTROL_LABELS.showSidebar}"`)
    expect(markup).toContain(`title="${SIDEBAR_CONTROL_LABELS.showSidebar}"`)
  })
})
