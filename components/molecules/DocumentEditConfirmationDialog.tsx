'use client'

import type { ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'

import { Button } from '@atoms/Button'
import type { DocumentEditChange } from 'types/documentEditing'

interface DocumentEditConfirmationDialogProps {
  open: boolean
  mode: 'save' | 'discard'
  changes: DocumentEditChange[]
  error?: string | null
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return 'Empty'
  if (typeof value === 'string') return value || 'Empty'
  return JSON.stringify(value)
}

export function DocumentEditConfirmationDialog({
  open,
  mode,
  changes,
  error = null,
  isSubmitting = false,
  onClose,
  onConfirm,
}: DocumentEditConfirmationDialogProps): ReactElement {
  const isSave = mode === 'save'

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth={'sm'}>
      <DialogTitle>{isSave ? 'Save document changes?' : 'Discard unsaved changes?'}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity={'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {isSave ? (
          changes.length > 0 ? (
            <List disablePadding>
              {changes.map((change, index) => (
                <ListItem key={`${change.fieldName}-${index}`} disableGutters>
                  <ListItemText
                    primary={change.fieldName}
                    secondary={`${displayValue(change.previousValue)} → ${displayValue(change.newValue)}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity={'info'}>{'There are no changes to save.'}</Alert>
          )
        ) : (
          <Alert severity={'warning'}>{'Your unsaved changes will be lost.'}</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant={'ghost'} disabled={isSubmitting} onClick={onClose}>
          {'Keep Editing'}
        </Button>
        <Button variant={isSave ? 'primary' : 'secondary'} loading={isSubmitting} onClick={onConfirm}>
          {isSave ? 'Confirm Save' : 'Discard Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
