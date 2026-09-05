'use client'

import { useMemo, type ReactElement } from 'react'
import { MenuItem, Stack, TextField } from '@mui/material'

import { ProcessBatchFormPanel } from '@molecules/ProcessBatchFormPanel'
import { REPROCESSING_STAGE_OPTIONS } from '@lib/reprocessingDrafts'
import type { CallbackStageKey } from 'types/pipelineContracts'

interface ReprocessingDraftFormProps {
  name: string
  collectionName: string
  collectionNotes: string
  restartStage: CallbackStageKey
  reason: string
  isSubmitting: boolean
  canSubmit: boolean
  error: string | null
  nameExists?: boolean
  batchNameSearchError?: string | null
  onNameChange: (value: string) => void
  onCollectionNameChange: (value: string) => void
  onCollectionNotesChange: (value: string) => void
  onRestartStageChange: (value: CallbackStageKey) => void
  onReasonChange: (value: string) => void
  onSubmit: () => void
  submitLabel?: string
  disableRestartStage?: boolean
}

export function ReprocessingDraftForm({
  name,
  collectionName,
  collectionNotes,
  restartStage,
  reason,
  isSubmitting,
  canSubmit,
  error,
  nameExists = false,
  batchNameSearchError = null,
  onNameChange,
  onCollectionNameChange,
  onCollectionNotesChange,
  onRestartStageChange,
  onReasonChange,
  onSubmit,
  submitLabel = 'Add to reprocessing cart',
  disableRestartStage = false,
}: ReprocessingDraftFormProps): ReactElement {
  const stageOptions = useMemo(() => REPROCESSING_STAGE_OPTIONS, [])

  return (
    <Stack spacing={2}>
      <ProcessBatchFormPanel
        batchName={name}
        collectionName={collectionName}
        collectionNotes={collectionNotes}
        isSubmitting={isSubmitting}
        isRefreshing={false}
        canSubmit={canSubmit && !nameExists}
        submitError={error}
        acceptedBatchName={null}
        batchNameSearchError={batchNameSearchError}
        batchNameExists={nameExists}
        onBatchNameChange={onNameChange}
        onCollectionNameChange={onCollectionNameChange}
        onCollectionNotesChange={onCollectionNotesChange}
        onSubmit={onSubmit}
        onRefresh={() => undefined}
        title={'Create a reprocessing batch'}
        description={'Name the draft and choose the stage and reason.'}
        submitLabel={submitLabel}
        showRefresh={false}
      />
      <TextField
        select
        fullWidth
        label={'Start stage'}
        value={restartStage}
        disabled={disableRestartStage}
        onChange={(event) => onRestartStageChange(event.target.value as CallbackStageKey)}
      >
        {stageOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        required
        multiline
        minRows={3}
        label={'Reason'}
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder={'Explain why this document needs to be reprocessed.'}
      />
    </Stack>
  )
}
