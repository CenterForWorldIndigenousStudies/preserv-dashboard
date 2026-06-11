'use client'

import type { ReactNode } from 'react'
import { Box } from '@mui/material'

import { AppShell } from '@organisms/AppShell'

interface LayoutBodyProps {
  children: ReactNode
  isAuthenticated?: boolean
}

export default function LayoutBody({ children, isAuthenticated }: LayoutBodyProps) {
  if (isAuthenticated === false) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: { xs: 2, md: 3, lg: 4 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Box sx={{ margin: '0 auto', maxWidth: '80rem' }}>{children}</Box>
        </Box>
      </Box>
    )
  }

  return <AppShell>{children}</AppShell>
}
