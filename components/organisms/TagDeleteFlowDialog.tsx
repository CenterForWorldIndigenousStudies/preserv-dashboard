'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import { Button } from '@atoms/Button'

interface TagDeleteFlowDialogProps {
  open: boolean
  title: string
  subjectName: string
  usageCount: number | null
  primaryMessage: string
  checkboxLabel?: string
  secondConfirmMessage: string
  onClose: () => void
  onConfirm: (deleteTagFromSystem: boolean) => Promise<void>
}

export function TagDeleteFlowDialog({
  open,
  title,
  subjectName,
  usageCount,
  primaryMessage,
  checkboxLabel,
  secondConfirmMessage,
  onClose,
  onConfirm,
}: TagDeleteFlowDialogProps): ReactElement {
  const allowDeleteFromSystem = Boolean(checkboxLabel)
  const [deleteTagFromSystem, setDeleteTagFromSystem] = useState(false)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setDeleteTagFromSystem(false)
    setCurrentStep(1)
    setIsSubmitting(false)
    setError(null)
  }, [open])

  const usageLabel = useMemo(() => {
    if (usageCount === null) {
      return 'Checking where this is used...'
    }

    const noun = usageCount === 1 ? 'document' : 'documents'
    return `This ${subjectName} is associated with ${usageCount} ${noun}.`
  }, [subjectName, usageCount])

  async function handlePrimaryConfirm(): Promise<void> {
    setError(null)

    if (allowDeleteFromSystem && deleteTagFromSystem) {
      setCurrentStep(2)
      return
    }

    setIsSubmitting(true)

    try {
      await onConfirm(false)
    } catch (confirmError) {
      const message =
        confirmError instanceof Error ? confirmError.message : `Unable to remove ${subjectName} right now.`
      setError(message)
      setIsSubmitting(false)
    }
  }

  async function handleSecondaryConfirm(): Promise<void> {
    setError(null)
    setIsSubmitting(true)

    try {
      await onConfirm(true)
    } catch (confirmError) {
      const message =
        confirmError instanceof Error ? confirmError.message : `Unable to delete ${subjectName} right now.`
      setError(message)
      setIsSubmitting(false)
    }
  }

  function handleClose(): void {
    if (isSubmitting) {
      return
    }

    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      sx={{ '& .MuiDialog-paper': { borderRadius: '1rem' } }}
    >
      <DialogTitle>{currentStep === 1 ? title : 'Are you sure?'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
        {error ? <Typography sx={{ color: '#b71c1c', fontSize: '0.9rem' }}>{error}</Typography> : null}
        {currentStep === 1 ? (
          <>
            <Typography sx={{ color: 'rgba(35,31,32,0.8)', fontSize: '0.95rem' }}>{primaryMessage}</Typography>
            <Typography sx={{ color: 'rgba(35,31,32,0.7)', fontSize: '0.9rem' }}>{usageLabel}</Typography>
            {checkboxLabel ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteTagFromSystem}
                    onChange={(event) => setDeleteTagFromSystem(event.target.checked)}
                    disabled={isSubmitting || usageCount === null}
                  />
                }
                label={checkboxLabel}
              />
            ) : null}
          </>
        ) : (
          <Typography sx={{ color: 'rgba(35,31,32,0.8)', fontSize: '0.95rem' }}>{secondConfirmMessage}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        {currentStep === 1 ? (
          <Button variant="secondary" onClick={() => void handlePrimaryConfirm()} loading={isSubmitting}>
            Yes
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => void handleSecondaryConfirm()} loading={isSubmitting}>
            Yes, delete
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
