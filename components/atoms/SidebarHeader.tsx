'use client'

import type { ReactElement, ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

export interface SidebarHeaderProps {
  action?: ReactNode
  className?: string
  title: string
}

export function SidebarHeader({ action, className, title }: SidebarHeaderProps): ReactElement {
  const componentClass = (`header-sidebar ${className}`).trim()
  return (
    <Box
      className={componentClass}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'ink.main',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Typography>
      {action ?? null}
    </Box>
  )
}
