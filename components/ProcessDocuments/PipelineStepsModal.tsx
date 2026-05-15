'use client'

import { type ReactElement } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'

import type { PipelineSelectionDraft } from '@lib/pipelineConfig'
import { PipelineSelectionSummary } from './PipelineSelectionSummary'
import { PipelineStepSelector } from './PipelineStepSelector'

interface PipelineStepsModalProps {
  open: boolean
  draft: PipelineSelectionDraft
  onClose: () => void
  onDraftChange: (draft: PipelineSelectionDraft) => void
}

export function PipelineStepsModal({
  open,
  draft,
  onClose,
  onDraftChange,
}: PipelineStepsModalProps): ReactElement {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      scroll="paper"
    >
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography variant="h5">Pipeline Steps</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure the steps for this processing run. Changes update the summary right away.
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <PipelineStepSelector
            draft={draft}
            mode={draft.mode}
            onDraftChange={onDraftChange}
          />
          <Box>
            <PipelineSelectionSummary draft={draft} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
