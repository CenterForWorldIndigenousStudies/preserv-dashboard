import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { PRESERVATION_PIPELINE_TITLE } from '@constants/branding'
import { SIDEBAR_CONTROL_LABELS } from '@constants/sidebar'
import Sidebar, { getSidebarLayoutStyles } from '@organisms/Sidebar'
import { DASHBOARD_PATH } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'

const { mockSignOut, mockUsePathname, mockUseSession } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockUsePathname: vi.fn(),
  mockUseSession: vi.fn(),
}))

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()

  return {
    ...actual,
    Drawer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  }
})

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}))

vi.mock('next-auth/react', () => ({
  signOut: mockSignOut,
  useSession: mockUseSession,
}))

describe('Sidebar', () => {
  afterEach(() => {
    mockSignOut.mockReset()
    mockUsePathname.mockReset()
    mockUseSession.mockReset()
  })

  it('uses the white panel surface for desktop and mobile panels', () => {
    expect(getSidebarLayoutStyles('desktop').panel).toMatchObject({
      bgcolor: 'surface.panel',
    })
    expect(getSidebarLayoutStyles('mobile').panel).toMatchObject({
      bgcolor: 'surface.panel',
    })
  })

  it('renders the shared application title', () => {
    mockUsePathname.mockReturnValue(DASHBOARD_PATH)
    mockUseSession.mockReturnValue({
      data: { user: { email: 'reviewer@cwis.org' } },
      status: 'authenticated',
    })

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <Sidebar variant="desktop" />
      </ThemeProvider>,
    )

    expect(markup).toContain(PRESERVATION_PIPELINE_TITLE)
    expect(markup).toContain(`href="${DASHBOARD_PATH}"`)
  })

  it('renders the approved visible routes after the tags and reports routes are introduced', () => {
    mockUsePathname.mockReturnValue(DASHBOARD_PATH)
    mockUseSession.mockReturnValue({
      data: { user: { email: 'reviewer@cwis.org' } },
      status: 'authenticated',
    })

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <Sidebar variant={'desktop'} />
      </ThemeProvider>,
    )

    expect(markup).toContain(PRESERVATION_PIPELINE_TITLE)
    expect(markup).toContain(PAGE_LABELS.documents)
    expect(markup).toContain(PAGE_LABELS.process)
    expect(markup).toContain(PAGE_LABELS.reviewQueue)
    expect(markup).toContain(PAGE_LABELS.readyForLibrary)
    expect(markup).toContain(PAGE_LABELS.library)
    expect(markup).toContain(PAGE_LABELS.batches)
    expect(markup).toContain(PAGE_LABELS.collections)
    expect(markup).toContain(PAGE_LABELS.tags)
    expect(markup).toContain(PAGE_LABELS.reports)
    expect(markup).toContain(PAGE_LABELS.exclusionReview)
    expect(markup).toContain(PAGE_LABELS.db)
    expect(markup).toContain(PAGE_LABELS.componentLibrary)
  })

  it('preserves mobile close behavior in the drawer header', () => {
    mockUsePathname.mockReturnValue(DASHBOARD_PATH)
    mockUseSession.mockReturnValue({
      data: { user: { email: 'reviewer@cwis.org' } },
      status: 'authenticated',
    })

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <Sidebar isOpen={true} onClose={() => {}} variant={'mobile'} />
      </ThemeProvider>,
    )

    expect(markup).toContain(SIDEBAR_CONTROL_LABELS.closeNavigation)
    expect(markup).toContain('Batches')
  })
})
