'use client'

import { useId, useState, type ReactElement } from 'react'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export interface AuditValuePopoverProps {
  value: string
  label: 'before' | 'after'
}

export function AuditValuePopover({ value, label }: AuditValuePopoverProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const popoverId = `audit-${label}-value-${useId().replace(/:/g, '-')}`
  const isOpen = Boolean(anchorEl)
  const title = `${label[0].toUpperCase()}${label.slice(1)} value`

  return (
    <>
      <Button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup={'dialog'}
        aria-label={`View ${label} value`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        size={'small'}
        variant={'text'}
        sx={{ minWidth: 0, px: 0.5, textTransform: 'none' }}
      >
        {'View value'}
      </Button>
      <Popover
        id={popoverId}
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: { xs: 'calc(100vw - 32px)', sm: 560 },
              maxHeight: 'min(70vh, 560px)',
              overflow: 'auto',
              p: 1.5,
            },
          },
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant={'caption'} color={'text.secondary'} sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography component={'pre'} sx={{ m: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {value}
          </Typography>
        </Stack>
      </Popover>
    </>
  )
}
