'use client'

import type { ReactElement } from 'react'
import { BatchDraftForm } from '@molecules/BatchDraftForm'
import {
  getDefaultReprocessingPipelineConfig,
  getReprocessingDownstreamStages,
  pipelineConfigToReprocessingRequestedStages,
  REPROCESSING_STAGE_OPTIONS,
} from '@lib/reprocessingDrafts'
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
    <BatchDraftForm
      name={name}
      collectionName={collectionName}
      collectionNotes={collectionNotes}
      startStage={restartStage}
      requestedStages={requestedStages}
      pipelineConfig={pipelineConfig}
      stageOptions={REPROCESSING_STAGE_OPTIONS}
      getDownstreamStages={getReprocessingDownstreamStages}
      getDefaultPipelineConfig={getDefaultReprocessingPipelineConfig}
      getRequestedStages={pipelineConfigToReprocessingRequestedStages}
      reason={reason}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      error={error}
      nameExists={nameExists}
      batchNameSearchError={batchNameSearchError}
      onNameChange={onNameChange}
      onCollectionNameChange={onCollectionNameChange}
      onCollectionNotesChange={onCollectionNotesChange}
      onStartStageChange={onRestartStageChange}
      onRequestedStagesChange={onRequestedStagesChange}
      onPipelineConfigChange={onPipelineConfigChange}
      onReasonChange={onReasonChange}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      title={'Create a reprocessing batch'}
      description={'Name the draft and choose the stages and reason.'}
      showNormalizationPasses
    />
  )
}
