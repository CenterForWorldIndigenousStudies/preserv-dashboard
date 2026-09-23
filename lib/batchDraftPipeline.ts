import {
  draftToPipelineConfig,
  pipelineConfigToRequestedStages,
  expandPresetToDraft,
  type PipelineConfig,
} from '@lib/pipelineConfig'
import {
  DATA_INGESTER_SERVICE,
  getCallbackStageForService,
  getServiceIdForCallbackStage,
} from '@constants/pipeline'
import {
  getPipelineServiceContractForService,
  getPipelineServiceDisplayName,
} from '@constants/pipelineServices'
import {
  getDefaultReprocessingPipelineConfig,
  getReprocessingDownstreamStages,
} from '@lib/reprocessingDrafts'
import type { CallbackStageKey } from 'types/pipelineContracts'

const NORMAL_BATCH_STAGE_VALUES: CallbackStageKey[] = [
  DATA_INGESTER_SERVICE,
  'document_splitter',
  'page_rotator',
  'ocr_processor',
  'content_dedup',
  'metadata_extractor',
]

export const BATCH_DRAFT_STAGE_OPTIONS = NORMAL_BATCH_STAGE_VALUES.map((value) => {
    const service = getServiceIdForCallbackStage(value)
    if (!service) {
      throw new Error(`No pipeline service exists for callback stage ${value}`)
    }
    const contract = getPipelineServiceContractForService(service)
    return {
      value,
      label: contract.display_name,
      description: contract.description,
    }
  }) satisfies readonly { value: CallbackStageKey; label: string; description: string }[]

const NORMAL_BATCH_STAGE_ORDER: CallbackStageKey[] = [
  DATA_INGESTER_SERVICE,
  'document_splitter',
  'page_rotator',
  'ocr_processor',
  'content_dedup',
  'metadata_extractor',
]

export function getBatchDraftDownstreamStages(startStage: CallbackStageKey): CallbackStageKey[] {
  const index = NORMAL_BATCH_STAGE_ORDER.indexOf(startStage)
  return index >= 0 ? NORMAL_BATCH_STAGE_ORDER.slice(index) : getReprocessingDownstreamStages(startStage)
}

export function getDefaultBatchDraftPipelineConfig(startStage: CallbackStageKey): PipelineConfig {
  if (startStage === DATA_INGESTER_SERVICE) {
    return draftToPipelineConfig(expandPresetToDraft('custom'))
  }
  return getDefaultReprocessingPipelineConfig(startStage)
}

export function batchDraftPipelineConfigToRequestedStages(config: PipelineConfig): CallbackStageKey[] {
  return pipelineConfigToRequestedStages(config)
    .map((service) => getCallbackStageForService(service))
    .filter((stage): stage is CallbackStageKey => NORMAL_BATCH_STAGE_ORDER.includes(stage as CallbackStageKey))
}

export function getBatchDraftStageLabel(stage: CallbackStageKey): string {
  return getPipelineServiceDisplayName(getServiceIdForCallbackStage(stage) ?? stage)
}

export function getBatchDraftInitialConfig(): PipelineConfig {
  return getDefaultBatchDraftPipelineConfig(DATA_INGESTER_SERVICE)
}
