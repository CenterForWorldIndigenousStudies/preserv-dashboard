import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { AppShell } from '@organisms/AppShell'
import { DASHBOARD_PATH } from '@constants/paths'

const { mockSignOut, mockUsePathname, mockUseSession } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockUsePathname: vi.fn(),
  mockUseSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}))

vi.mock('next-auth/react', () => ({
  signOut: mockSignOut,
  useSession: mockUseSession,
}))

describe('AppShell', () => {
  afterEach(() => {
    mockSignOut.mockReset()
    mockUsePathname.mockReset()
    mockUseSession.mockReset()
  })

  it('renders the shared shell header and preserves child content', () => {
    mockUsePathname.mockReturnValue(DASHBOARD_PATH)
    mockUseSession.mockReturnValue({
      data: { user: { email: 'reviewer@cwis.org' } },
      status: 'authenticated',
    })

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <AppShell>
          <div>Shell Child Content</div>
        </AppShell>
      </ThemeProvider>,
    )

    expect(markup).toContain('Dashboard')
    expect(markup).toContain('Shell Child Content')
    expect(markup).toContain('reviewer@cwis.org')
    expect(markup).toContain('Open navigation menu')
  })

  it('exposes the documents, tags, and reports routes in the shared shell', () => {
    mockUsePathname.mockReturnValue(DASHBOARD_PATH)
    mockUseSession.mockReturnValue({
      data: { user: { email: 'reviewer@cwis.org' } },
      status: 'authenticated',
    })

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <AppShell>
          <div>Shell Child Content</div>
        </AppShell>
      </ThemeProvider>,
    )

    expect(markup).toContain('Component Library')
    expect(markup).toContain('Documents')
    expect(markup).toContain('Tags')
    expect(markup).toContain('Reports')
  })
})
