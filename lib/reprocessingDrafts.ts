import type { CallbackStageKey } from 'types/pipelineContracts'
import {
  createDefaultDraft,
  draftToPipelineConfig,
  pipelineConfigToDraft,
  pipelineConfigToRequestedStages,
  type PipelineConfig,
  type PipelineSelectionDraft,
} from '@lib/pipelineConfig'

export const DEFAULT_REPROCESSING_START_STAGE: CallbackStageKey = 'ocr_processor'

export const REPROCESSING_STAGE_OPTIONS: Array<{ value: CallbackStageKey; label: string }> = [
  { value: 'document_splitter', label: 'Document Splitter' },
  { value: 'page_rotator', label: 'Page Rotator' },
  { value: 'ocr_processor', label: 'OCR Processor' },
  { value: 'content_dedup', label: 'Content Deduplication' },
  { value: 'metadata_extractor', label: 'Metadata Extractor' },
]

export const REPROCESSING_EXECUTION_STAGE_ORDER: CallbackStageKey[] = [
  ...REPROCESSING_STAGE_OPTIONS.map((option) => option.value),
]

export const PIPELINE_EXECUTION_STAGE_ORDER: CallbackStageKey[] = [
  ...REPROCESSING_EXECUTION_STAGE_ORDER,
  'fedora_ingester',
]

function callbackStageForService(service: string): CallbackStageKey | null {
  const stage = service === 'metadata-extraction' ? 'metadata_extractor' : service.replaceAll('-', '_')
  return PIPELINE_EXECUTION_STAGE_ORDER.includes(stage as CallbackStageKey)
    ? (stage as CallbackStageKey)
    : null
}

export function getReprocessingStageLabel(stage: CallbackStageKey): string {
  if (stage === 'fedora_ingester') {
    return 'Fedora Ingester'
  }

  return REPROCESSING_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage
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
