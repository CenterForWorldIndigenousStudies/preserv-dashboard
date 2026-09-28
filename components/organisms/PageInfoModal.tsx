'use client'

import { useState, type ReactElement, type ReactNode } from 'react'

import IconButton from '@mui/material/IconButton'

import { IconInfo } from '@atoms/icons/IconInfo'

import { Modal } from './Modal'

interface PageInfoModalProps {
  children: ReactNode
  title: string
}

export function PageInfoModal({ children, title }: PageInfoModalProps): ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconButton
        aria-label={'Page information'}
        onClick={() => setOpen(true)}
        sx={{
          color: 'info.main',
          height: 80,
          width: 80,
        }}
      >
        <IconInfo size={48} />
      </IconButton>
      <Modal open={open} onClose={() => setOpen(false)} title={title} maxWidth={'md'}>
        {children}
      </Modal>
    </>
  )
}
