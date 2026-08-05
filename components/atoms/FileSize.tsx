'use client'

import { useState, type ReactNode } from 'react'
import { Typography } from '@mui/material'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import { formatBytes } from '@lib/formatBytes'

interface FileSizeProps {
  value: bigint | number | null | undefined
  className?: string
  sx?: SxProps<Theme>
}

/**
 * Formats a file size in human-readable form (e.g. 1.5 MB) with click-to-toggle
 * to raw bytes. Hovering shows the inverse value as a tooltip.
 */
export function FileSize({ value, className = '', sx }: FileSizeProps): ReactNode {
  const [showRaw, setShowRaw] = useState(false)

  if (value === null || value === undefined) {
    return (
      <Typography component="span" variant="body2" className={className || undefined} sx={sx}>
        -
      </Typography>
    )
  }

  const raw: number = typeof value === 'bigint' ? Number(value) : (value ?? 0)
  const human = raw === 0 ? '0' : formatBytes(raw)
  const rawFormatted = `${Number(raw).toLocaleString()} bytes`
  const display = showRaw ? rawFormatted : human
  const tooltip = showRaw ? human : rawFormatted

  return (
    <Typography
      component="span"
      variant="body2"
      title={tooltip}
      className={className || undefined}
      onClick={() => setShowRaw((prev) => !prev)}
      sx={(theme: Theme) => {
        return {
          cursor: 'pointer',
          borderRadius: 1,
          px: 1,
          py: 0.5,
          transition: theme.transitions.create('background-color'),
          '&:hover': {
            backgroundColor: alpha(theme.palette.background.default, 0.8),
          },
          ...theme.unstable_sx(sx ?? {}),
        }
      }}
    >
      {display}
    </Typography>
  )
}
