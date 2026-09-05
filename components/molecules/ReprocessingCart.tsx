'use client'

import Link from 'next/link'
import { useState, type ReactElement } from 'react'
import {
  Badge,
  Box,
  Button as MuiButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'

import { Button } from '@atoms/Button'
import { IconBatchReprocessing } from '@atoms/icons/IconBatchReprocessing'
import { PROCESS_DOCUMENTS_PATH } from '@constants/paths'
import { getReprocessingStageLabel } from '@lib/reprocessingDrafts'
import type { ReprocessingDraftSummary } from 'types/reprocessingDrafts'

interface ReprocessingCartProps {
  drafts: readonly ReprocessingDraftSummary[]
  onRefresh?: () => void
}

export function ReprocessingCart({ drafts, onRefresh }: ReprocessingCartProps): ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={'secondary'}
        size={'sm'}
        startIcon={<IconBatchReprocessing size={20} />}
        aria-label={`Open reprocessing cart with ${drafts.length} draft batches`}
        onClick={() => setOpen(true)}
      >
        {'Reprocessing cart'}
        <Badge
          badgeContent={drafts.length}
          color={'primary'}
          sx={{
            ml: 2,
            '& .MuiBadge-badge': {
              position: 'static',
              transform: 'none',
            },
            '& .MuiBadge-badge.MuiBadge-invisible': {
              display: 'none',
            },
          }}
        />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth={'sm'}>
        <DialogTitle>{'Reprocessing batches'}</DialogTitle>
        <DialogContent dividers>
          {drafts.length === 0 ? (
            <Typography color={'text.secondary'}>{'No draft reprocessing batches yet.'}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {drafts.map((draft) => (
                <Box
                  key={draft.id}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{draft.name}</Typography>
                    <Typography variant={'caption'} color={'text.secondary'}>
                      {`${draft.documentCount} document${draft.documentCount === 1 ? '' : 's'} · ${getReprocessingStageLabel(draft.restartStage)}`}
                    </Typography>
                  </Box>
                  <MuiButton
                    component={Link}
                    href={`${PROCESS_DOCUMENTS_PATH}?draftId=${encodeURIComponent(draft.id)}`}
                    onClick={() => setOpen(false)}
                  >
                    {'Manage'}
                  </MuiButton>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {onRefresh ? <MuiButton onClick={onRefresh}>{'Refresh'}</MuiButton> : null}
          <MuiButton onClick={() => setOpen(false)}>{'Close'}</MuiButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
