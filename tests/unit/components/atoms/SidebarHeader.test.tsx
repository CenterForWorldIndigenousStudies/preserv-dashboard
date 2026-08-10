import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { PRESERVATION_PIPELINE_TITLE } from '@constants/branding'
import { DASHBOARD_PATH } from '@constants/paths'
import { SIDEBAR_CONTROL_LABELS } from '@constants/sidebar'
import { SidebarHeader } from '@atoms/SidebarHeader'

describe('SidebarHeader', () => {
  it('renders the title text', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarHeader title={PRESERVATION_PIPELINE_TITLE} />
      </ThemeProvider>,
    )

    expect(markup).toContain(PRESERVATION_PIPELINE_TITLE)
  })

  it('renders the optional action slot when provided', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarHeader
          title={PRESERVATION_PIPELINE_TITLE}
          action={<button aria-label={SIDEBAR_CONTROL_LABELS.closeNavigation}>Close</button>}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain(SIDEBAR_CONTROL_LABELS.closeNavigation)
    expect(markup).toContain('Close')
  })

  it('renders the title as a link when a title href is provided', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <SidebarHeader title={PRESERVATION_PIPELINE_TITLE} titleHref={DASHBOARD_PATH} />
      </ThemeProvider>,
    )

    expect(markup).toContain(`href="${DASHBOARD_PATH}"`)
    expect(markup).toContain(PRESERVATION_PIPELINE_TITLE)
    expect(markup).toContain('background-color:var(--cwis-palette-surface-selected)')
    expect(markup).toContain('justify-content:center')
  })
})
