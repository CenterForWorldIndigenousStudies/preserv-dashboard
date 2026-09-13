'use client'

import { useState, type KeyboardEvent, type ReactElement } from 'react'
import { Tooltip, Typography } from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'

import { humanizeMetadataName } from '@lib/strings'

interface MetadataNameWithNotesProps {
  name: string
  displayName?: string
  notes: string | null | undefined
}

export function MetadataNameWithNotes({ name, displayName, notes }: MetadataNameWithNotesProps): ReactElement {
  const [showOriginal, setShowOriginal] = useState(false)
  const normalizedNotes = notes?.trim() || null
  const humanizedName = displayName ?? humanizeMetadataName(name)
  const friendlyName = showOriginal ? name : humanizedName

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    setShowOriginal((previous) => !previous)
  }

  return (
    <Tooltip
      title={normalizedNotes ?? ''}
      arrow
      enterDelay={400}
      disableHoverListener={!normalizedNotes}
      disableFocusListener={!normalizedNotes}
      disableTouchListener={!normalizedNotes}
    >
      <Typography
        component={'span'}
        variant={'body2'}
        role={'button'}
        tabIndex={0}
        aria-label={normalizedNotes ? `${name}: ${normalizedNotes}` : undefined}
        aria-pressed={showOriginal}
        onClick={() => setShowOriginal((previous) => !previous)}
        onKeyDown={handleKeyDown}
        sx={(theme: Theme) => ({
          cursor: 'pointer',
          borderBottom: '1px dotted',
          borderColor: alpha(theme.palette.text.primary, 0.3),
          '&:hover': {
            borderColor: alpha(theme.palette.text.primary, 0.7),
          },
        })}
      >
        {friendlyName}
      </Typography>
    </Tooltip>
  )
}
