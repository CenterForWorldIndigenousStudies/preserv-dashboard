'use client'

import type { ReactElement } from 'react'
import { Stack, TextField } from '@mui/material'

import { ProcessBatchFormPanel } from '@molecules/ProcessBatchFormPanel'
import { ReprocessingStageSelector } from '@molecules/ReprocessingStageSelector'
import type { PipelineConfig } from '@lib/pipelineConfig'
import type { CallbackStageKey } from 'types/pipelineContracts'

interface ReprocessingDraftFormProps {
  name: string
  collectionName: string
  collectionNotes: string
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  pipelineConfig?: PipelineConfig
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
  onRequestedStagesChange: (value: CallbackStageKey[]) => void
  onPipelineConfigChange?: (value: PipelineConfig) => void
  onReasonChange: (value: string) => void
  onSubmit: () => void
  submitLabel?: string
}

export function ReprocessingDraftForm({
  name,
  collectionName,
  collectionNotes,
  restartStage,
  requestedStages,
  pipelineConfig,
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
  onRequestedStagesChange,
  onPipelineConfigChange,
  onReasonChange,
  onSubmit,
  submitLabel = 'Add to reprocessing cart',
}: ReprocessingDraftFormProps): ReactElement {
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
        description={'Name the draft and choose the stages and reason.'}
        submitLabel={submitLabel}
        showRefresh={false}
      />
      <ReprocessingStageSelector
        restartStage={restartStage}
        requestedStages={requestedStages}
        pipelineConfig={pipelineConfig}
        onRestartStageChange={onRestartStageChange}
        onRequestedStagesChange={onRequestedStagesChange}
        onPipelineConfigChange={onPipelineConfigChange}
      />
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
