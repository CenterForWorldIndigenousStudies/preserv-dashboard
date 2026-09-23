'use client'

import type { ReactElement } from 'react'
import { Stack, TextField } from '@mui/material'

import { ProcessBatchFormPanel } from '@molecules/ProcessBatchFormPanel'
import { PipelineStageSelection, type PipelineStageOption } from '@molecules/PipelineStageSelection'
import type { PipelineConfig } from '@lib/pipelineConfig'
import type { CallbackStageKey } from 'types/pipelineContracts'

interface BatchDraftFormProps {
  name: string
  collectionName: string
  collectionNotes: string
  startStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  pipelineConfig?: PipelineConfig
  stageOptions: readonly PipelineStageOption[]
  getDownstreamStages: (stage: CallbackStageKey) => CallbackStageKey[]
  getDefaultPipelineConfig: (stage: CallbackStageKey) => PipelineConfig
  getRequestedStages: (config: PipelineConfig) => CallbackStageKey[]
  reason: string
  isSubmitting: boolean
  canSubmit: boolean
  error: string | null
  nameExists?: boolean
  batchNameSearchError?: string | null
  disabled?: boolean
  showNormalizationPasses?: boolean
  onNameChange: (value: string) => void
  onCollectionNameChange: (value: string) => void
  onCollectionNotesChange: (value: string) => void
  onStartStageChange: (value: CallbackStageKey) => void
  onRequestedStagesChange: (value: CallbackStageKey[]) => void
  onPipelineConfigChange?: (value: PipelineConfig) => void
  onReasonChange: (value: string) => void
  onSubmit: () => void
  submitLabel?: string
  title?: string
  description?: string
}

export function BatchDraftForm({
  name,
  collectionName,
  collectionNotes,
  startStage,
  requestedStages,
  pipelineConfig,
  stageOptions,
  getDownstreamStages,
  getDefaultPipelineConfig,
  getRequestedStages,
  reason,
  isSubmitting,
  canSubmit,
  error,
  nameExists = false,
  batchNameSearchError = null,
  disabled = false,
  showNormalizationPasses = false,
  onNameChange,
  onCollectionNameChange,
  onCollectionNotesChange,
  onStartStageChange,
  onRequestedStagesChange,
  onPipelineConfigChange,
  onReasonChange,
  onSubmit,
  submitLabel = 'Create draft',
  title = 'Batch details',
  description = 'Name the draft and choose the stages and reason.',
}: BatchDraftFormProps): ReactElement {
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
        title={title}
        description={description}
        submitLabel={submitLabel}
        showRefresh={false}
      />
      <PipelineStageSelection
        startStage={startStage}
        requestedStages={requestedStages}
        pipelineConfig={pipelineConfig}
        stageOptions={stageOptions}
        getDownstreamStages={getDownstreamStages}
        getDefaultPipelineConfig={getDefaultPipelineConfig}
        getRequestedStages={getRequestedStages}
        disabled={disabled}
        showNormalizationPasses={showNormalizationPasses}
        onStartStageChange={onStartStageChange}
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
        disabled={disabled}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder={'Explain why this batch should be processed.'}
      />
    </Stack>
  )
}
