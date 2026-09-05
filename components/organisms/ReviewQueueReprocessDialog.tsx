'use client'

import type { ReactElement } from 'react'
import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Tab, Tabs, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import { useBatchSearch } from '@lib/hooks/useBatchSearch'
import { ReprocessingDraftForm } from '@molecules/ReprocessingDraftForm'
import { ReprocessingDraftPicker } from '@molecules/ReprocessingDraftPicker'
import type { CallbackStageKey } from 'types/pipelineContracts'
import type { ReprocessingDraftSummary } from 'types/reprocessingDrafts'

export type ReviewQueueReprocessMode = 'create' | 'existing'

export interface ReviewQueueReprocessDialogProps {
  open: boolean
  documentName: string
  mode: ReviewQueueReprocessMode
  name: string
  collectionName: string
  collectionNotes: string
  restartStage: CallbackStageKey
  reason: string
  drafts: readonly ReprocessingDraftSummary[]
  selectedDraftId: string | null
  pending: boolean
  canCreate: boolean
  error?: string | null
  onClose: () => void
  onModeChange: (mode: ReviewQueueReprocessMode) => void
  onNameChange: (value: string) => void
  onCollectionNameChange: (value: string) => void
  onCollectionNotesChange: (value: string) => void
  onRestartStageChange: (value: CallbackStageKey) => void
  onReasonChange: (value: string) => void
  onSelectedDraftChange: (draft: ReprocessingDraftSummary | null) => void
  onSubmit: () => void
}

export function ReviewQueueReprocessDialog({
  open,
  documentName,
  mode,
  name,
  collectionName,
  collectionNotes,
  restartStage,
  reason,
  drafts,
  selectedDraftId,
  pending,
  canCreate,
  error = null,
  onClose,
  onModeChange,
  onNameChange,
  onCollectionNameChange,
  onCollectionNotesChange,
  onRestartStageChange,
  onReasonChange,
  onSelectedDraftChange,
  onSubmit,
}: ReviewQueueReprocessDialogProps): ReactElement {
  const hasExistingDrafts = drafts.length > 0
  const activeMode = hasExistingDrafts ? mode : 'create'
  const batchNameSearch = useBatchSearch(name, { enabled: open && activeMode === 'create', limit: 1 })
  const batchNameExists = Boolean(name.trim()) && batchNameSearch.exactMatch !== null

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth={'sm'} disablePortal>
      <DialogTitle>{'Add document to a reprocessing batch'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {!hasExistingDrafts ? (
            <Typography variant={'body2'} color={'text.secondary'}>
              {`Create a reprocessing batch for “${documentName}”.`}
            </Typography>
          ) : null}
          {hasExistingDrafts ? (
            <>
              <Typography variant={'body2'} color={'text.secondary'}>
                {`Choose how to reprocess “${documentName}”.`}
              </Typography>
              <Tabs
                value={activeMode}
                onChange={(_, value: ReviewQueueReprocessMode) => onModeChange(value)}
                aria-label={'Reprocessing batch options'}
                variant={'fullWidth'}
              >
                <Tab value={'create'} label={'Create new draft'} />
                <Tab value={'existing'} label={'Add to existing draft'} />
              </Tabs>
              <Divider />
            </>
          ) : null}
          {activeMode === 'create' ? (
            <ReprocessingDraftForm
              name={name}
              collectionName={collectionName}
              collectionNotes={collectionNotes}
              restartStage={restartStage}
              reason={reason}
              isSubmitting={pending}
              canSubmit={canCreate}
              error={error}
              nameExists={batchNameExists}
              batchNameSearchError={batchNameSearch.error}
              onNameChange={onNameChange}
              onCollectionNameChange={onCollectionNameChange}
              onCollectionNotesChange={onCollectionNotesChange}
              onRestartStageChange={onRestartStageChange}
              onReasonChange={onReasonChange}
              onSubmit={onSubmit}
              submitLabel={'Create draft'}
            />
          ) : (
            <ReprocessingDraftPicker drafts={drafts} value={selectedDraftId} onChange={onSelectedDraftChange} />
          )}
        </Stack>
      </DialogContent>
      {activeMode === 'existing' ? (
        <DialogActions>
          <Button variant={'secondary'} onClick={onClose} disabled={pending}>
            {'Cancel'}
          </Button>
          <Button onClick={onSubmit} disabled={!selectedDraftId} loading={pending}>
            {'Add document'}
          </Button>
        </DialogActions>
      ) : null}
    </Dialog>
  )
}
