'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import { Button } from '@atoms/Button'

interface RemoveTagDialogProps {
  open: boolean
  tagName: string
  usageCount: number | null
  onClose: () => void
  onConfirm: (options: { deleteTagFromSystem: boolean }) => Promise<void>
}

export function RemoveTagDialog({
  open,
  tagName,
  usageCount,
  onClose,
  onConfirm,
}: RemoveTagDialogProps): ReactElement {
  const [deleteTagFromSystem, setDeleteTagFromSystem] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const otherDocumentCount = useMemo(() => Math.max((usageCount ?? 0) - 1, 0), [usageCount])
  const canDeleteFromSystem = usageCount !== null && otherDocumentCount === 0

  useEffect(() => {
    if (!open) {
      return
    }

    setDeleteTagFromSystem(false)
    setError(null)
    setIsSubmitting(false)
  }, [open])

  async function handleConfirm(): Promise<void> {
    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm({ deleteTagFromSystem })
    } catch (confirmError) {
      const message = confirmError instanceof Error ? confirmError.message : 'Unable to remove tag right now.'
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      sx={{ '& .MuiDialog-paper': { borderRadius: '1rem' } }}
    >
      <DialogTitle>Remove Tag</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <p className="text-sm text-ink/80">
          Are you sure you want to remove <span className="font-semibold">{tagName}</span> from this document?
        </p>
        {usageCount === null ? (
          <p className="text-sm text-ink/60">Checking where this tag is used...</p>
        ) : canDeleteFromSystem ? (
          <>
            <Alert severity="info">
              This tag is not used by other documents. You can also delete it from the system entirely.
            </Alert>
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteTagFromSystem}
                  onChange={(event) => setDeleteTagFromSystem(event.target.checked)}
                />
              }
              label="Also delete this tag from the system"
            />
          </>
        ) : (
          <Alert severity="info">
            This tag is used by other documents so it will remain in the system after removal.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          No
        </Button>
        <Button variant="secondary" onClick={() => void handleConfirm()} loading={isSubmitting}>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  )
}
