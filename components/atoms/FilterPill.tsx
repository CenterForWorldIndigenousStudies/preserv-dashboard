import type { ReactNode } from 'react'
import NextLink from 'next/link'
import { Link } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

interface FilterPillProps {
  label: string
  isActive: boolean
  href: string
  className?: string
  sx?: SxProps<Theme>
}

/**
 * Atom: Interactive filter pill for filter toolbars.
 * Renders a Next.js Link with active/inactive styling.
 */
export function FilterPill({ label, isActive, href, className = '', sx }: FilterPillProps): ReactNode {
  return (
    <Link
      component={NextLink}
      href={href}
      className={className || undefined}
      underline="none"
      sx={(theme: Theme) => {
        const mossColor = theme.palette.moss?.main ?? theme.palette.primary.main
        const sandColor = theme.palette.sand?.main ?? theme.palette.background.default
        const skyColor = theme.palette.sky?.main ?? theme.palette.action.hover

        return {
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '9999px',
          px: 2,
          py: 1,
          fontSize: '0.875rem',
          backgroundColor: isActive ? mossColor : sandColor,
          color: isActive ? theme.palette.moss?.contrastText ?? '#ffffff' : theme.palette.text.primary,
          transition: theme.transitions.create(['background-color', 'color']),
          '&:hover': {
            backgroundColor: isActive ? mossColor : skyColor,
          },
          ...theme.unstable_sx(sx ?? {}),
        }
      }}
    >
      {label}
    </Link>
  )
}
