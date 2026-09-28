'use client'

import type { ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'

import { Button } from '@atoms/Button'
import type { DocumentEditWarning } from '@lib/documentEditAccess'
import { Modal } from '@organisms/Modal'

interface DocumentEditAccessDialogProps {
  open: boolean
  warning: DocumentEditWarning
  reason: string
  error?: string | null
  isSubmitting?: boolean
  onReasonChange: (reason: string) => void
  onClose: () => void
  onConfirm: () => void
}

const WARNING_COPY: Record<DocumentEditWarning, string> = {
  approved:
    "This document has already been approved. If you make any edits to the document, it will go back to the 'Review Queue' and will need explicit approval. Are you sure you want to do this?",
  published:
    "This document has already been published. If you make any edits to the document, it will go back to the 'Review Queue' and will need explicit approval. Are you sure you want to do this?",
}

export function DocumentEditAccessDialog({
  open,
  warning,
  reason,
  error = null,
  isSubmitting = false,
  onReasonChange,
  onClose,
  onConfirm,
}: DocumentEditAccessDialogProps): ReactElement {
  return (
    <Modal
      open={open}
      onClose={onClose}
      disableClose={isSubmitting}
      title={'Confirm document editing'}
      actions={
        <>
          <Button variant={'ghost'} disabled={isSubmitting} onClick={onClose}>
            {'No'}
          </Button>
          <Button variant={'primary'} loading={isSubmitting} disabled={!reason.trim()} onClick={onConfirm}>
            {'Yes'}
          </Button>
        </>
      }
    >
        <Alert severity={'warning'} sx={{ mb: 2 }}>
          {WARNING_COPY[warning]}
        </Alert>
        {error ? (
          <Alert severity={'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <TextField
          autoFocus
          fullWidth
          required
          label={'Reason'}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          disabled={isSubmitting}
          helperText={'Explain why this document needs to be edited.'}
        />
    </Modal>
  )
}
