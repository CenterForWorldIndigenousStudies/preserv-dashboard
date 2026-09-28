'use client'

import { type ReactElement } from 'react'
import {
  Box,
  Button,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'

import type { PipelineSelectionDraft } from '@lib/pipelineConfig'
import { PipelineSelectionSummary } from '@molecules/PipelineSelectionSummary'
import { PipelineStepSelector } from '@molecules/PipelineStepSelector'
import { Modal } from '@organisms/Modal'

interface PipelineStepsModalProps {
  open: boolean
  draft: PipelineSelectionDraft
  onClose: () => void
  onDraftChange: (draft: PipelineSelectionDraft) => void
}

export function PipelineStepsModal({ open, draft, onClose, onDraftChange }: PipelineStepsModalProps): ReactElement {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth={'md'}
      dialogProps={{ fullScreen, scroll: 'paper' }}
      title={
        <>
          <Typography component={'h2'} variant={'h5'}>
            {'Pipeline Steps'}
          </Typography>
          <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
            {'Configure the steps for this processing run. Changes update the summary right away.'}
          </Typography>
        </>
      }
      contentDividers
      actions={<Button onClick={onClose} variant={'contained'}>{'Done'}</Button>}
    >
        <Stack spacing={3}>
          <PipelineStepSelector draft={draft} mode={draft.mode} onDraftChange={onDraftChange} />
          <Box>
            <PipelineSelectionSummary draft={draft} />
          </Box>
        </Stack>
    </Modal>
  )
}
