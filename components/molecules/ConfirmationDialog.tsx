'use client'

import type { ReactElement } from 'react'
import Typography from '@mui/material/Typography'
import { Button } from '@atoms/Button'
import { Modal } from '@organisms/Modal'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps): ReactElement {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      maxWidth={'xs'}
      title={title}
      actions={
        <>
          <Button variant={'ghost'} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={'secondary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>{message}</Typography>
    </Modal>
  )
}
