import type { ReactNode } from 'react'
import { Chip } from '@mui/material'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

export const variantMap = {
  danger: 'error',
  warning: 'warning',
  info: 'info',
  success: 'success',
  neutral: 'secondary',
} as const

export type BadgeVariant = keyof typeof variantMap

interface BadgeProps {
  variant?: BadgeVariant
  outlined?: boolean
  children: ReactNode
  className?: string
  sx?: SxProps<Theme>
}

/**
 * Atom: Semantic badge pill used for status and lightweight emphasis.
 * Variants represent UI intent, not fixed color names, so the palette can change
 * without forcing call sites to rename props.
 */
export function Badge({ variant = 'info', outlined = false, children, className = '', sx }: BadgeProps): ReactNode {
  const paletteKey = variantMap[variant]
  const textPaletteKey = variant === 'success' ? paletteKey : 'text'
  const backgroundOpacity = variant === 'danger' || variant === 'warning' ? 0.15 : variant === 'success' ? 0.1 : 1

  return (
    <Chip
      component={'span'}
      className={className || undefined}
      label={children}
      size={'small'}
      sx={(theme: Theme) => {
        const backgroundPalette = theme.palette[paletteKey] ?? theme.palette.primary
        const textColor = textPaletteKey === 'text' ? theme.palette.text.primary : theme.palette[paletteKey].main

        return {
          border: outlined ? `1px solid ${backgroundPalette.main}` : undefined,
          borderRadius: '9999px',
          backgroundColor: outlined ? 'transparent' : alpha(backgroundPalette.main, backgroundOpacity),
          color: textColor,
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          '& .MuiChip-label': {
            px: 1.5,
          },
          ...theme.unstable_sx(sx ?? {}),
        }
      }}
    />
  )
}
