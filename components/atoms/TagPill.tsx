import type { ReactElement } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import { IconX } from '@atoms/icons/IconX'

interface TagPillProps {
  tag: string
  onRemove: (tag: string) => void
  className?: string
}

/**
 * Atom: Selected tag with a remove button.
 */
export function TagPill({ tag, onRemove, className = '' }: TagPillProps): ReactElement {
  return (
    <Box
      component={'span'}
      className={className || undefined}
      sx={(theme: Theme) => {
        const actionColor = theme.palette.primary.main

        return {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          borderRadius: '9999px',
          px: 1.5,
          py: 0.5,
          backgroundColor: alpha(actionColor, 0.1),
          color: actionColor,
        }
      }}
    >
      <Typography component={'span'} variant={'body2'} color={'inherit'}>
        {tag}
      </Typography>
      <IconButton
        size={'small'}
        onClick={() => {
          onRemove(tag)
        }}
        aria-label={`Remove ${tag}`}
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
    </Box>
  )
}
