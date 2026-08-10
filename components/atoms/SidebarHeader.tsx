'use client'

import NextLink from 'next/link'
import type { ReactElement, ReactNode } from 'react'
import { Box, Link, Typography } from '@mui/material'

export interface SidebarHeaderProps {
  action?: ReactNode
  className?: string
  title: string
  titleHref?: string
}

function TitleElement({ title }: { title: string }): ReactElement {
  return (
    <Typography
      component={'span'}
      variant={'body2'}
      sx={{
        color: 'text.primary',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {title}
    </Typography>
  )
}

export function SidebarHeader({ action, className, title, titleHref }: SidebarHeaderProps): ReactElement {
  const componentClass = `header-sidebar ${className}`.trim()

  return (
    <Box
      className={componentClass}
      sx={{
        display: 'flex',
        justifyContent: `${action ? 'space-between' : 'center'}`,
      }}
    >
      {titleHref ? (
        <Link
          component={NextLink}
          href={titleHref}
          color={'inherit'}
          underline={'none'}
          sx={{
            borderRadius: 1,
            alignSelf: action ? 'flex-start' : 'center',
            padding: '8px 16px',
            transition: 'background-color 150ms ease-in-out',
            '&:hover': {
              backgroundColor: 'surface.selected',
            },
          }}
        >
          <TitleElement title={title} />
        </Link>
      ) : (
        <TitleElement title={title} />
      )}
      {action ?? null}
    </Box>
  )
}
