'use client'

import type { ReactElement, ReactNode } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'
import NextLink from 'next/link'

import { IconX } from '@atoms/icons/IconX'

interface ValuePillProps {
  value: string
  href?: string
  onRemove?: () => void
  tooltip?: ReactNode
  className?: string
}

export function ValuePill({ value, href, onRemove, tooltip, className = '' }: ValuePillProps): ReactElement {
  const pillContent = (
    <>
      <Typography component={'span'} variant={'body2'} color={'inherit'}>
        {value}
      </Typography>
      {onRemove ? (
        <IconButton
          size={'small'}
          onClick={onRemove}
          aria-label={`Remove ${value}`}
          sx={(theme: Theme) => {
            const actionColor = theme.palette.primary.main

            return {
              ml: 0.5,
              p: 0.25,
              color: 'inherit',
              '&:hover': {
                backgroundColor: alpha(actionColor, 0.2),
              },
            }
          }}
        >
          <IconX size={12} />
        </IconButton>
      ) : null}
    </>
  )
  const pillSx = (theme: Theme) => {
    const actionColor = theme.palette.primary.main

    const baseSx = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      borderRadius: '9999px',
      px: 1.5,
      py: 0.5,
      backgroundColor: alpha(actionColor, 0.1),
      color: actionColor,
    }

    return href
      ? {
          ...baseSx,
          cursor: 'pointer',
          transition: theme.transitions.create('background-color'),
          '&:hover': {
            backgroundColor: alpha(actionColor, 0.2),
            color: theme.palette.primary.dark,
          },
        }
      : baseSx
  }
  const pill = href ? (
    <Link
      component={NextLink}
      href={href}
      underline={'none'}
      color={'inherit'}
      className={className || undefined}
      sx={pillSx}
    >
      {pillContent}
    </Link>
  ) : (
    <Box component={'span'} className={className || undefined} sx={pillSx}>
      {pillContent}
    </Box>
  )

  return tooltip ? (
    <Tooltip title={tooltip} arrow>
      {pill}
    </Tooltip>
  ) : (
    pill
  )
}
