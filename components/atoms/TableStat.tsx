import type { ReactElement, ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

interface TableStatProps {
  label: string
  value: ReactNode
  sx?: SxProps<Theme>
}

export function TableStat({ label, value, sx }: TableStatProps): ReactElement {
  return (
    <Box
      component={'span'}
      sx={(theme: Theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: '9999px',
        backgroundColor: theme.palette.background.default,
        px: 1.5,
        py: 0.5,
        ...theme.unstable_sx(sx ?? {}),
      })}
    >
      <Typography
        component={'span'}
        variant={'caption'}
        sx={{
          color: 'text.secondary',
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
      <Typography
        component={'span'}
        variant={'caption'}
        sx={{
          color: 'text.primary',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}
