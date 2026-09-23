'use client'

import Link from 'next/link'
import { useState, type ReactElement } from 'react'
import { Badge, Box, Button as MuiButton, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import { IconBatchProcessing } from '@atoms/icons/IconBatchProcessing'
import { PROCESS_DOCUMENTS_PATH } from '@constants/paths'
import { getBatchDraftStageLabel } from '@lib/batchDraftPipeline'
import type { BatchDraftSummary } from 'types/batchDrafts'

interface BatchCartProps {
  drafts: readonly BatchDraftSummary[]
  onRefresh?: () => void
  onManageDraft?: (draftId: string) => void
}

export function BatchCart({ drafts, onRefresh, onManageDraft }: BatchCartProps): ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={'secondary'}
        size={'sm'}
        startIcon={<IconBatchProcessing size={20} />}
        aria-label={`Open batch cart with ${drafts.length} draft batches`}
        onClick={() => setOpen(true)}
      >
        {'Batch cart'}
        <Badge
          badgeContent={drafts.length}
          color={'primary'}
          sx={{
            ml: 2,
            '& .MuiBadge-badge': { position: 'static', transform: 'none' },
            '& .MuiBadge-badge.MuiBadge-invisible': { display: 'none' },
          }}
        />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth={'sm'}>
        <DialogTitle>{'Batch drafts'}</DialogTitle>
        <DialogContent dividers>
          {drafts.length === 0 ? (
            <Typography color={'text.secondary'}>{'No batch drafts yet.'}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {drafts.map((draft) => (
                <Box key={draft.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{draft.name}</Typography>
                    <Typography variant={'caption'} color={'text.secondary'}>
                      {`${draft.sourceFolderIds?.length ?? 0} folder${(draft.sourceFolderIds?.length ?? 0) === 1 ? '' : 's'} · ${draft.sourceDocumentIds?.length ?? draft.documentCount} document${(draft.sourceDocumentIds?.length ?? draft.documentCount) === 1 ? '' : 's'} · ${getBatchDraftStageLabel(draft.restartStage)}`}
                    </Typography>
                  </Box>
                  {onManageDraft ? (
                    <MuiButton
                      onClick={() => {
                        setOpen(false)
                        onManageDraft(draft.id)
                      }}
                    >
                      {'Manage'}
                    </MuiButton>
                  ) : (
                    <MuiButton
                      component={Link}
                      href={`${PROCESS_DOCUMENTS_PATH}?draftId=${encodeURIComponent(draft.id)}`}
                      onClick={() => setOpen(false)}
                    >
                      {'Manage'}
                    </MuiButton>
                  )}
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
