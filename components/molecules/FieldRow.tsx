import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

interface FieldRowProps {
  label: string
  children: ReactNode
  className?: string
  sx?: SxProps<Theme>
}

/**
 * Molecule: Label + value pair for document detail pages.
 */
export function FieldRow({ label, children, className = '', sx }: FieldRowProps): ReactNode {
  return (
    <Box
      component={'div'}
      className={className || undefined}
      sx={(theme: Theme) => ({
        borderRadius: 3,
        backgroundColor: alpha(theme.palette.background.default, 0.45),
        p: 2,
        ...theme.unstable_sx(sx ?? {}),
      })}
    >
      <Typography
        component={'dt'}
        variant={'caption'}
        sx={{
          color: 'text.secondary',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
      <Typography component={'dd'} variant={'body2'} sx={{ mt: 1, color: 'text.primary', wordBreak: 'break-word' }}>
        {children}
      </Typography>
    </Box>
  )
}
