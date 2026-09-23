'use client'

import type { ReactElement } from 'react'

import {
  getDefaultReprocessingPipelineConfig,
  getReprocessingDownstreamStages,
  getReprocessingStageLabel,
  pipelineConfigToReprocessingRequestedStages,
  REPROCESSING_STAGE_OPTIONS,
} from '@lib/reprocessingDrafts'
import type { PipelineConfig } from '@lib/pipelineConfig'
import { PipelineStageSelection } from '@molecules/PipelineStageSelection'
import type { CallbackStageKey } from 'types/pipelineContracts'

interface ReprocessingStageSelectorProps {
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  pipelineConfig?: PipelineConfig
  disabled?: boolean
  onRestartStageChange: (stage: CallbackStageKey) => void
  onRequestedStagesChange: (stages: CallbackStageKey[]) => void
  onPipelineConfigChange?: (config: PipelineConfig) => void
}

export function ReprocessingStageSelector({
  restartStage,
  requestedStages,
  pipelineConfig,
  disabled = false,
  onRestartStageChange,
  onRequestedStagesChange,
  onPipelineConfigChange,
}: ReprocessingStageSelectorProps): ReactElement {
  return (
    <PipelineStageSelection
      startStage={restartStage}
      requestedStages={requestedStages}
      pipelineConfig={pipelineConfig}
      stageOptions={REPROCESSING_STAGE_OPTIONS}
      getDownstreamStages={getReprocessingDownstreamStages}
      getDefaultPipelineConfig={getDefaultReprocessingPipelineConfig}
      getRequestedStages={pipelineConfigToReprocessingRequestedStages}
      disabled={disabled}
      showNormalizationPasses
      onStartStageChange={onRestartStageChange}
      onRequestedStagesChange={onRequestedStagesChange}
      onPipelineConfigChange={onPipelineConfigChange}
    />
  )
}

export { getReprocessingStageLabel }
