import type { CallbackStageKey } from 'types/pipelineContracts'
import {
  getPipelineServiceContractForService,
  getPipelineServiceDisplayName,
} from '@constants/pipelineServices'
import { getServiceIdForCallbackStage } from '@constants/pipeline'
import {
  createDefaultDraft,
  draftToPipelineConfig,
  pipelineConfigToDraft,
  pipelineConfigToRequestedStages,
  type PipelineConfig,
  type PipelineSelectionDraft,
} from '@lib/pipelineConfig'

export const DEFAULT_REPROCESSING_START_STAGE: CallbackStageKey = 'ocr_processor'

const REPROCESSING_STAGE_VALUES: CallbackStageKey[] = [
  'document_splitter',
  'page_rotator',
  'ocr_processor',
  'content_dedup',
  'metadata_extractor',
]

export const REPROCESSING_STAGE_OPTIONS: Array<{
  value: CallbackStageKey
  label: string
  description: string
}> =
  REPROCESSING_STAGE_VALUES.map((value) => {
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
  })

export const REPROCESSING_EXECUTION_STAGE_ORDER: CallbackStageKey[] = [
  ...REPROCESSING_STAGE_OPTIONS.map((option) => option.value),
]

export const PIPELINE_EXECUTION_STAGE_ORDER: CallbackStageKey[] = [
  ...REPROCESSING_EXECUTION_STAGE_ORDER,
  'fedora_ingester',
]

function callbackStageForService(service: string): CallbackStageKey | null {
  return PIPELINE_EXECUTION_STAGE_ORDER.includes(service as CallbackStageKey)
    ? (service as CallbackStageKey)
    : null
}

export function getReprocessingStageLabel(stage: CallbackStageKey): string {
  return getPipelineServiceDisplayName(getServiceIdForCallbackStage(stage) ?? stage)
}

export function getReprocessingDownstreamStages(stage: CallbackStageKey): CallbackStageKey[] {
  const stageIndex = REPROCESSING_EXECUTION_STAGE_ORDER.indexOf(stage)
  return stageIndex < 0 ? [] : REPROCESSING_EXECUTION_STAGE_ORDER.slice(stageIndex)
}

export function normalizeReprocessingRequestedStages(
  restartStage: CallbackStageKey,
  requestedStages: readonly CallbackStageKey[],
): CallbackStageKey[] {
  const downstreamStages = getReprocessingDownstreamStages(restartStage)
  const requested = [...new Set(requestedStages)]
  const expected = downstreamStages.slice(0, Math.max(1, requested.length))

  if (requested.length === 0) {
    return downstreamStages.slice(0, 1)
  }

  return requested.every((stage, index) => stage === expected[index]) && requested[0] === restartStage ? requested : []
}

function defaultReprocessingDraft(restartStage: CallbackStageKey): PipelineSelectionDraft {
  const downstreamStages = new Set(getReprocessingDownstreamStages(restartStage))
  const draft = createDefaultDraft()
  const canRunPasses = restartStage === 'document_splitter' || restartStage === 'page_rotator'
  const pass1 = {
    ...draft.steps.normalizePass1,
    enabled: canRunPasses,
    subSelection: {
      split: restartStage === 'document_splitter',
      rotate: downstreamStages.has('page_rotator'),
    },
  }
  const pass2 = {
    ...draft.steps.normalizePass2,
    enabled: canRunPasses,
    subSelection: {
      split: canRunPasses,
      rotate: canRunPasses,
    },
  }

  return {
    ...draft,
    steps: {
      ...draft.steps,
      normalizePass1: pass1,
      normalizePass2: pass2,
      ocrProcessor: downstreamStages.has('ocr_processor'),
      contentDedup: downstreamStages.has('content_dedup'),
      metadataExtraction: downstreamStages.has('metadata_extractor'),
    },
  }
}

export function getDefaultReprocessingPipelineConfig(restartStage: CallbackStageKey): PipelineConfig {
  return draftToPipelineConfig(defaultReprocessingDraft(restartStage))
}

export function getReprocessingPipelineConfig(
  restartStage: CallbackStageKey,
  requestedStages: readonly CallbackStageKey[],
): PipelineConfig {
  const draft = pipelineConfigToDraft(getDefaultReprocessingPipelineConfig(restartStage))
  const selectedStages = new Set(requestedStages)
  const normalizePassesSelected = restartStage === 'document_splitter' || restartStage === 'page_rotator'

  draft.steps.normalizePass1 = {
    ...draft.steps.normalizePass1,
    enabled: normalizePassesSelected,
    subSelection: {
      split: selectedStages.has('document_splitter') && restartStage === 'document_splitter',
      rotate: selectedStages.has('page_rotator'),
    },
  }
  draft.steps.normalizePass2 = {
    ...draft.steps.normalizePass2,
    enabled: normalizePassesSelected && selectedStages.has('page_rotator'),
    subSelection: {
      split: normalizePassesSelected && selectedStages.has('document_splitter') && selectedStages.has('page_rotator'),
      rotate: normalizePassesSelected && selectedStages.has('page_rotator'),
    },
  }
  draft.steps.ocrProcessor = selectedStages.has('ocr_processor')
  draft.steps.contentDedup = selectedStages.has('content_dedup')
  draft.steps.metadataExtraction = selectedStages.has('metadata_extractor')
  return draftToPipelineConfig(draft)
}

export function pipelineConfigToReprocessingRequestedStages(config: PipelineConfig): CallbackStageKey[] {
  return pipelineConfigToRequestedStages(config)
    .map(callbackStageForService)
    .filter((stage): stage is CallbackStageKey => stage !== null)
}
