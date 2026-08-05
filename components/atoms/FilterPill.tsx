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
        return {
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '9999px',
          px: 2,
          py: 1,
          fontSize: '0.875rem',
          backgroundColor: isActive ? theme.palette.primary.main : theme.palette.background.default,
          color: isActive ? theme.palette.primary.contrastText : theme.palette.text.primary,
          transition: theme.transitions.create(['background-color', 'color']),
          '&:hover': {
            backgroundColor: isActive ? theme.palette.primary.main : theme.palette.action.hover,
          },
          ...theme.unstable_sx(sx ?? {}),
        }
      }}
    >
      {label}
    </Link>
  )
}
