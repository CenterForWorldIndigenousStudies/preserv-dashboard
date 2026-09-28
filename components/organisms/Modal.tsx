'use client'

import type { ReactElement, ReactNode } from 'react'

import Dialog, { type DialogProps } from '@mui/material/Dialog'
import DialogActions, { type DialogActionsProps } from '@mui/material/DialogActions'
import DialogContent, { type DialogContentProps } from '@mui/material/DialogContent'
import DialogTitle, { type DialogTitleProps } from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'

import { IconX } from '@atoms/icons/IconX'

export interface ModalProps {
  actions?: ReactNode
  children: ReactNode
  closeLabel?: string
  contentDividers?: boolean
  contentSx?: DialogContentProps['sx']
  disableClose?: boolean
  dialogProps?: Omit<DialogProps, 'children' | 'fullWidth' | 'maxWidth' | 'onClose' | 'open'>
  maxWidth?: DialogProps['maxWidth']
  onClose: () => void
  open: boolean
  title: ReactNode
  titleSx?: DialogTitleProps['sx']
  actionsSx?: DialogActionsProps['sx']
  paperSx?: Record<string, string | number>
}

const DEFAULT_PAPER_SX: Record<string, string | number> = {
  border: '1px solid rgba(25, 118, 210, 0.15)',
  borderRadius: '1rem',
  boxShadow: '0 24px 80px rgba(35, 31, 32, 0.18)',
}

export function Modal({
  actions,
  actionsSx,
  children,
  closeLabel = 'Close',
  contentDividers = false,
  contentSx,
  disableClose = false,
  dialogProps,
  maxWidth = 'sm',
  onClose,
  open,
  paperSx,
  title,
  titleSx,
}: ModalProps): ReactElement {
  return (
    <Dialog
      {...dialogProps}
      open={open}
      onClose={disableClose ? undefined : onClose}
      fullWidth
      maxWidth={maxWidth}
      sx={{ '& .MuiDialog-paper': { ...DEFAULT_PAPER_SX, ...paperSx } }}
    >
      <DialogTitle
        component={'div'}
        sx={{
          alignItems: 'flex-start',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          px: 3,
          pt: 3,
          pb: 1.5,
          ...titleSx,
        }}
      >
        <Stack sx={{ minWidth: 0 }}>{title}</Stack>
        <IconButton onClick={onClose} disabled={disableClose} aria-label={closeLabel} sx={{ mt: -1, mr: -1 }}>
          <IconX size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers={contentDividers} sx={{ px: 3, py: 1.5, ...contentSx }}>
        {children}
      </DialogContent>
      {actions ? <DialogActions sx={{ px: 3, pt: 2, pb: 3, ...actionsSx }}>{actions}</DialogActions> : null}
    </Dialog>
  )
}
