'use client'

import { useState, type ReactElement } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

import { Button } from '@atoms/Button'

export interface SelectionAction {
  label: string
  onClick: () => void
}

interface SelectionActionsButtonProps {
  selectedCount: number
  disabled?: boolean
  actions: readonly SelectionAction[]
}

export function SelectionActionsButton({ selectedCount, disabled = false, actions }: SelectionActionsButtonProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchorEl)

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
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
        {actions.map((action) => (
          <MenuItem key={action.label} onClick={() => {
            setAnchorEl(null)
            action.onClick()
          }}>
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
