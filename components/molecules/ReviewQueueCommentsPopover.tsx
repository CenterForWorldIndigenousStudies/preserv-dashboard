'use client'

import { useId, useState, type ReactElement, type ReactNode } from 'react'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export interface ReviewQueueCommentsPopoverProps {
  documentId: string
  comment?: string | null
  additionalComment?: string | null
  trigger: ReactNode
}

function normalizeComment(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : null
}

export function ReviewQueueCommentsPopover({
  documentId,
  comment,
  additionalComment,
  trigger,
}: ReviewQueueCommentsPopoverProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const popoverId = `review-comments-${documentId}-${useId().replace(/:/g, '-')}`
  const normalizedComment = normalizeComment(comment)
  const normalizedAdditionalComment = normalizeComment(additionalComment)
  const hasComments = Boolean(normalizedComment || normalizedAdditionalComment)
  const isOpen = Boolean(anchorEl)

  if (!hasComments) {
    return <>{trigger}</>
  }

  return (
    <>
      <Button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup={'dialog'}
        aria-label={`View review comments for document ${documentId}`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        size={'small'}
        variant={'text'}
        sx={{
          alignSelf: 'flex-start',
          minWidth: 0,
          px: 0,
          borderRadius: '9999px',
          textTransform: 'none',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        {trigger}
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
              maxWidth: { xs: 'calc(100vw - 32px)', sm: 480 },
              p: 1.5,
            },
          },
        }}
      >
        <Stack spacing={1}>
          <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
            {'Review comments'}
          </Typography>
          {normalizedComment ? (
            <Stack spacing={0.25}>
              <Typography variant={'caption'} color={'text.secondary'}>
                {'Comment'}
              </Typography>
              <Typography variant={'body2'}>{normalizedComment}</Typography>
            </Stack>
          ) : null}
          {normalizedAdditionalComment ? (
            <Stack spacing={0.25}>
              <Typography variant={'caption'} color={'text.secondary'}>
                {'Additional information'}
              </Typography>
              <Typography variant={'body2'}>{normalizedAdditionalComment}</Typography>
            </Stack>
          ) : null}
        </Stack>
      </Popover>
    </>
  )
}
