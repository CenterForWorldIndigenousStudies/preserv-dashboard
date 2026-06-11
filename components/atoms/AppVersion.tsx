'use client'

import type { ReactElement } from 'react'
import { Typography } from '@mui/material'

import { appVersion } from '@lib/appVersion'

export function AppVersion(): ReactElement {
  return (
    <Typography variant="caption" sx={{ color: 'ink.main', opacity: 0.72 }}>
      Version: {appVersion}
    </Typography>
  )
}
