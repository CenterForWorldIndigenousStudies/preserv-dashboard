import type { ReactElement } from 'react'
import { Tooltip, Typography } from '@mui/material'

interface MetadataNameWithNotesProps {
  name: string
  notes: string | null | undefined
}

export function MetadataNameWithNotes({ name, notes }: MetadataNameWithNotesProps): ReactElement {
  const normalizedNotes = notes?.trim() || null

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
        tabIndex={normalizedNotes ? 0 : undefined}
        aria-label={normalizedNotes ? `${name}: ${normalizedNotes}` : undefined}
        sx={{ cursor: normalizedNotes ? 'help' : 'inherit' }}
      >
        {name}
      </Typography>
    </Tooltip>
  )
}
