'use client'

import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Box } from '@mui/material'

import Sidebar from '@organisms/Sidebar'
import { AppShellHeader } from '@organisms/AppShellHeader'
import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps): ReactElement {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
    <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', bgcolor: 'sand.main' }}>
      <Box
        sx={{
          borderRight: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.3s ease-in-out',
          width: sidebarCollapsed ? 0 : 280,
        }}
      >
        <Sidebar variant="desktop" />
      </Box>

      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Box
          sx={{
            ml: sidebarCollapsed ? 0 : '-12px',
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

      <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
        <AppShellHeader onOpenNavigation={() => setMobileOpen(true)} />
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: { xs: 2, md: 3, lg: 4 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Box sx={{ margin: '0 auto', maxWidth: '80rem', width: '100%' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  )
}
