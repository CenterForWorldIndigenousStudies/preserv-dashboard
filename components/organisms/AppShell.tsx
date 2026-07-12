'use client'

import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Box, type SxProps, type Theme } from '@mui/material'

import Sidebar from '@organisms/Sidebar'
import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

interface AppShellProps {
  children: ReactNode
}

interface AppShellLayoutStyles {
  contentColumn: SxProps<Theme>
  main: SxProps<Theme>
  shell: SxProps<Theme>
  sidebarRail: SxProps<Theme>
}

export function getAppShellLayoutStyles(sidebarCollapsed: boolean): AppShellLayoutStyles {
  return {
    shell: {
      bgcolor: 'sand.main',
      display: 'flex',
      height: '100dvh',
      overflow: 'hidden',
    },
    sidebarRail: {
      borderColor: 'divider',
      borderRight: '1px solid',
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
      transition: 'width 0.3s ease-in-out',
      width: sidebarCollapsed ? 0 : 280,
    },
    contentColumn: {
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
      minHeight: 0,
      minWidth: 0,
    },
    main: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      px: { xs: 2, md: 3, lg: 4 },
      py: { xs: 3, md: 4 },
    },
  }
}

export function AppShell({ children }: AppShellProps): ReactElement {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const layoutStyles = getAppShellLayoutStyles(sidebarCollapsed)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') {
      setSidebarCollapsed(true)
    }
  }, [])

  const toggleCollapse = (): void => {
    setSidebarCollapsed((previous) => {
      const next = !previous
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <Box sx={layoutStyles.shell}>
      <Box sx={layoutStyles.sidebarRail}>
        <Sidebar variant="desktop" />
      </Box>

      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Box
          sx={{
            ml: 0,
            position: 'sticky',
            top: 80,
            transition: 'margin 0.3s ease-in-out',
            zIndex: 1250,
          }}
        >
          <SidebarVisibilityControl
            intent={sidebarCollapsed ? 'open' : 'close'}
            surface="desktopRail"
            onClick={toggleCollapse}
          />
        </Box>
      </Box>

      <Sidebar variant="mobile" isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box sx={layoutStyles.contentColumn}>
        <Box sx={{ display: { md: 'none' } }}>
          <SidebarVisibilityControl intent="open" surface="mobileBar" onClick={() => setMobileOpen(true)} />
        </Box>
        <Box component="main" sx={layoutStyles.main}>
          <Box sx={{ margin: '0 auto', maxWidth: '80rem', width: '100%' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  )
}
