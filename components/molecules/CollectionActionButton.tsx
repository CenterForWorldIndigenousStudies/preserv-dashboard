'use client'

import { useState, type ReactElement } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

import { Button } from '@atoms/Button'

export interface CollectionActionButtonProps {
  selectedCount: number
  disabled?: boolean
  hasDocuments: boolean
  onEdit: () => void
  onRename: () => void
  onAddDocuments: () => void
  onRemoveDocuments: () => void
  onDelete: () => void
}

export function CollectionActionButton({
  selectedCount,
  disabled = false,
  hasDocuments,
  onEdit,
  onRename,
  onAddDocuments,
  onRemoveDocuments,
  onDelete,
}: CollectionActionButtonProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchorEl)

  function closeMenu(): void {
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        variant={'secondary'}
        size={'sm'}
        disabled={disabled || selectedCount === 0}
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
            onEdit()
          }}
        >
          {'Edit'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onRename()
          }}
        >
          {'Rename'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onAddDocuments()
          }}
        >
          {'Add Documents'}
        </MenuItem>
        <MenuItem
          disabled={!hasDocuments}
          onClick={() => {
            closeMenu()
            onRemoveDocuments()
          }}
        >
          {'Remove Documents'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onDelete()
          }}
        >
          {'Delete'}
        </MenuItem>
      </Menu>
    </>
  )
}
