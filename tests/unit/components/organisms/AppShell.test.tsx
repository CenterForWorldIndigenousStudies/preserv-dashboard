// @vitest-environment jsdom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { SIDEBAR_CONTROL_LABELS } from '@constants/sidebar'
import { AppShell, getAppShellLayoutStyles } from '@organisms/AppShell'

interface MockSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  variant: 'desktop' | 'mobile'
}

interface MockVisibilityControlProps {
  intent: 'open' | 'close'
  onClick: () => void
  surface: 'mobileBar' | 'desktopRail'
}

vi.mock('@organisms/Sidebar', () => ({
  default: ({ isOpen, onClose, variant }: MockSidebarProps) => (
    <div data-open={variant === 'mobile' ? String(Boolean(isOpen)) : undefined} data-testid={`sidebar-${variant}`}>
      {variant === 'mobile' && isOpen ? (
        <button data-testid="mock-mobile-close" onClick={onClose} type="button" />
      ) : null}
    </div>
  ),
}))

vi.mock('@molecules/SidebarVisibilityControl', () => ({
  SidebarVisibilityControl: ({ intent, onClick, surface }: MockVisibilityControlProps) => {
    const ariaLabel =
      surface === 'desktopRail'
        ? intent === 'close'
          ? SIDEBAR_CONTROL_LABELS.hideSidebar
          : SIDEBAR_CONTROL_LABELS.showSidebar
        : SIDEBAR_CONTROL_LABELS.openNavigation

    return (
      <button aria-label={ariaLabel} onClick={onClick} type="button">
        {ariaLabel}
      </button>
    )
  },
}))

let mountedRoot: Root | undefined

function renderAppShell(children: ReactNode = <div data-testid="shell-child">Shell Child Content</div>): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(
      <ThemeProvider>
        <AppShell>{children}</AppShell>
      </ThemeProvider>,
    )
  })

  return container
}

function getButton(container: HTMLElement, ariaLabel: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`)

  if (!button) {
    throw new Error(`Expected button with aria-label "${ariaLabel}"`)
  }

  return button
}

describe('AppShell', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
    window.localStorage.clear()
  })

  it('preserves the shell layout contract for expanded and collapsed sidebars', () => {
    const expanded = getAppShellLayoutStyles(false)
    const collapsed = getAppShellLayoutStyles(true)

    expect(expanded.shell).toMatchObject({
      bgcolor: 'surface.canvas',
      display: 'flex',
      height: '100dvh',
      overflow: 'hidden',
    })
    expect(expanded.sidebarRail).toMatchObject({
      flexShrink: 0,
      overflow: 'hidden',
      width: 280,
    })
    expect(collapsed.sidebarRail).toMatchObject({ width: 0 })
    expect(expanded.contentColumn).toMatchObject({
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
      minHeight: 0,
      minWidth: 0,
    })
    expect(expanded.main).toMatchObject({
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
    })
  })

  it('renders both sidebar variants and preserves child content', () => {
    const container = renderAppShell()

    expect(container.querySelector('[data-testid="sidebar-desktop"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="sidebar-mobile"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="shell-child"]')?.textContent).toBe('Shell Child Content')
  })

  it('restores persisted sidebar collapse state and persists toggles', () => {
    window.localStorage.setItem('sidebar-collapsed', 'true')
    const container = renderAppShell()

    expect(getButton(container, SIDEBAR_CONTROL_LABELS.showSidebar)).not.toBeNull()

    act(() => {
      getButton(container, SIDEBAR_CONTROL_LABELS.showSidebar).click()
    })

    expect(window.localStorage.getItem('sidebar-collapsed')).toBe('false')
    expect(getButton(container, SIDEBAR_CONTROL_LABELS.hideSidebar)).not.toBeNull()
  })

  it('opens and closes mobile navigation through the shell controls', () => {
    const container = renderAppShell()

    expect(container.querySelector('[data-testid="sidebar-mobile"]')?.getAttribute('data-open')).toBe('false')

    act(() => {
      getButton(container, SIDEBAR_CONTROL_LABELS.openNavigation).click()
    })

    expect(container.querySelector('[data-testid="sidebar-mobile"]')?.getAttribute('data-open')).toBe('true')

    act(() => {
      container.querySelector<HTMLElement>('[data-testid="mock-mobile-close"]')?.click()
    })

    expect(container.querySelector('[data-testid="sidebar-mobile"]')?.getAttribute('data-open')).toBe('false')
  })
})
