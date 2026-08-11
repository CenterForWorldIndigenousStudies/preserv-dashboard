'use client'

import { useId, useState, type ReactElement } from 'react'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { Button } from '@atoms/Button'
import {
  buildDefaultReviewQueueChecklistState,
  REVIEW_QUEUE_CHECKLIST_ITEMS,
  type ReviewQueueChecklistItemKey,
  type ReviewQueueChecklistState,
} from '@constants/reviewQueueChecklist'

export { buildDefaultReviewQueueChecklistState, REVIEW_QUEUE_CHECKLIST_ITEMS }
export type { ReviewQueueChecklistItemKey, ReviewQueueChecklistState }

interface ReviewQueueChecklistPanelProps {
  documentId: string
  checklistState: ReviewQueueChecklistState
  onToggle: (itemKey: ReviewQueueChecklistItemKey) => void
}

export function ReviewQueueChecklistPanel({
  documentId,
  checklistState,
  onToggle,
}: ReviewQueueChecklistPanelProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const popoverId = `review-checklist-${documentId}-${useId().replace(/:/g, '-')}`
  const completedCount = REVIEW_QUEUE_CHECKLIST_ITEMS.filter(({ key }) => checklistState[key]).length
  const isOpen = Boolean(anchorEl)
  const progressValue = (completedCount / REVIEW_QUEUE_CHECKLIST_ITEMS.length) * 100

  return (
    <>
      <Button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup={'dialog'}
        aria-label={`Open checklist for document ${documentId}`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        size={'sm'}
        variant={'ghost'}
        sx={{
          minWidth: 0,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          textTransform: 'none',
          justifyContent: 'flex-start',
        }}
      >
        <Stack direction={'row'} spacing={0.75} sx={{ alignItems: 'center' }}>
          <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
            {'Checklist'}
          </Typography>
          <Typography variant={'caption'} color={'text.secondary'}>
            {`${completedCount}/${REVIEW_QUEUE_CHECKLIST_ITEMS.length}`}
          </Typography>
        </Stack>
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
              p: 1.5,
              width: { xs: 'calc(100vw - 32px)', sm: 320 },
              maxWidth: 320,
            },
          },
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction={'row'} spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
              {'Checklist'}
            </Typography>
            <Typography variant={'caption'} color={'text.secondary'}>
              {`${completedCount} of ${REVIEW_QUEUE_CHECKLIST_ITEMS.length}`}
            </Typography>
          </Stack>
          <LinearProgress variant={'determinate'} value={progressValue} aria-label={'Checklist progress'} />
          <Stack spacing={0.25}>
            {REVIEW_QUEUE_CHECKLIST_ITEMS.map(({ key, label }) => (
              <FormControlLabel
                key={key}
                control={<Checkbox checked={checklistState[key]} onChange={() => onToggle(key)} size={'small'} />}
                label={label}
                sx={{
                  m: 0,
                  minHeight: 32,
                  alignItems: 'center',
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.875rem',
                    color: 'text.primary',
                  },
                }}
              />
            ))}
          </Stack>
        </Stack>
      </Popover>
    </>
  )
}
