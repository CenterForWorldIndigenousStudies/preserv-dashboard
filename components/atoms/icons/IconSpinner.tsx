import type { ReactNode } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import type { IconProps } from './IconProps'

/**
 * Atom: Theme-aware loading indicator.
 */
export function IconSpinner({
  size = 20,
  className = '',
  ariaLabel = 'Loading',
}: IconProps & { ariaLabel?: string }): ReactNode {
  return (
    <CircularProgress size={size} aria-label={ariaLabel} className={className || undefined} sx={{ color: 'currentColor' }} />
  )
}
