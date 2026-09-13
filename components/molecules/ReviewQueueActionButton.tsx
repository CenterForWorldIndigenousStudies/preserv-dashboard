'use client'

import { useState, type ReactElement } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

import { Button } from '@atoms/Button'

export interface ReviewQueueActionButtonProps {
  batchActionPending: boolean
  selectedCount: number
  hasSelectedDraftDocuments: boolean
  onApprove: () => void
  onReject: () => void
  onReprocess: () => void
  onRemove: () => void
}

export function ReviewQueueActionButton({
  batchActionPending,
  selectedCount,
  hasSelectedDraftDocuments,
  onApprove,
  onReject,
  onReprocess,
  onRemove,
}: ReviewQueueActionButtonProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchorEl)

  const closeMenu = (): void => {
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        variant={'secondary'}
        size={'sm'}
        disabled={batchActionPending || selectedCount === 0}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup={'menu'}
        aria-expanded={menuOpen ? 'true' : undefined}
      >
        {`Actions (${selectedCount})`}
      </Button>
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            closeMenu()
            onApprove()
          }}
        >
          {'Approve'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onReject()
          }}
        >
          {'Reject'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onReprocess()
          }}
        >
          {'Reprocess'}
        </MenuItem>
        {hasSelectedDraftDocuments ? (
          <MenuItem
            onClick={() => {
              closeMenu()
              onRemove()
            }}
          >
            {'Remove from draft'}
          </MenuItem>
        ) : null}
      </Menu>
    </>
  )
}
