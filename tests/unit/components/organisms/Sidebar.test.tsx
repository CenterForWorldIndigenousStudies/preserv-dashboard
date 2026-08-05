import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import Sidebar, { getSidebarLayoutStyles } from '@organisms/Sidebar'
import { DASHBOARD_PATH } from '@constants/paths'

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

  it('renders the approved visible routes after the tags and reports routes are introduced', () => {
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

    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Documents')
    expect(markup).toContain('Process')
    expect(markup).toContain('Batches')
    expect(markup).toContain('Exclusion Review')
    expect(markup).toContain('Review Queue')
    expect(markup).toContain('Ready for Library')
    expect(markup).toContain('Collections')
    expect(markup).toContain('DB')
    expect(markup).toContain('Component Library')

    expect(markup).toContain('Tags')
    expect(markup).toContain('Reports')
    expect(markup).not.toContain('Batch Summary')
    expect(markup).not.toContain('Failures')
  })

  it('preserves mobile close behavior in the drawer header', () => {
    mockUsePathname.mockReturnValue(DASHBOARD_PATH)
    mockUseSession.mockReturnValue({
      data: { user: { email: 'reviewer@cwis.org' } },
      status: 'authenticated',
    })

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <Sidebar isOpen={true} onClose={() => {}} variant="mobile" />
      </ThemeProvider>,
    )

    expect(markup).toContain('Close navigation menu')
    expect(markup).toContain('Batches')
  })
})
