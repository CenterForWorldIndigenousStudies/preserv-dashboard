'use client'

import { useId, useState, type ReactElement } from 'react'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import type { NeedsReviewReasonGroup } from 'types/needsReview'

export interface NeedsReviewReasonsPopoverProps {
  documentId: string
  groups: NeedsReviewReasonGroup[]
}

function countReasons(groups: NeedsReviewReasonGroup[]): number {
  return groups.reduce(
    (total, group) => total + group.reasons.filter((reason) => reason.trim().length > 0).length,
    0,
  )
}

export function NeedsReviewReasonsPopover({
  documentId,
  groups,
}: NeedsReviewReasonsPopoverProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const popoverId = `needs-review-reasons-${useId().replace(/:/g, '-')}`
  const reasonCount = countReasons(groups)
  const isOpen = Boolean(anchorEl)

  if (reasonCount === 0) {
    return <span aria-label={'No needs review reasons'}>—</span>
  }

  const reasonLabel = reasonCount === 1 ? 'reason' : 'reasons'

  return (
    <>
      <Button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup={'dialog'}
        aria-label={`View ${reasonCount} needs review ${reasonLabel} for document ${documentId}`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        size={'small'}
        variant={'text'}
        sx={{ minWidth: 0, px: 0.5, textTransform: 'none' }}
      >
        {reasonCount} {reasonLabel}
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
              p: 1,
            },
          },
        }}
      >
        <NeedsReviewReasons value={groups} />
      </Popover>
    </>
  )
}
