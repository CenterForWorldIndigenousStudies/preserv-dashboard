'use client'

import type { ReactElement } from 'react'
import Box from '@mui/material/Box'

import { Button } from '@atoms/Button'

interface DocumentEditActionsProps {
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onCancel: () => void
}

export function DocumentEditActions({ isDirty, isSaving, onSave, onCancel }: DocumentEditActionsProps): ReactElement | null {
  if (!isDirty) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 16, md: 24 },
        bottom: { xs: 16, md: 24 },
        zIndex: (theme) => theme.zIndex.snackbar,
        display: 'flex',
        gap: 1,
        p: 1,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: 6,
      }}
    >
      <Button variant={'ghost'} disabled={isSaving} onClick={onCancel}>
        {'Cancel'}
      </Button>
      <Button variant={'primary'} loading={isSaving} onClick={onSave}>
        {'Save Changes'}
      </Button>
    </Box>
  )
}
