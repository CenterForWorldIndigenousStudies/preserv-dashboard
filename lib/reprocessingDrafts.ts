import type { CallbackStageKey } from 'types/pipelineContracts'

export const DEFAULT_REPROCESSING_START_STAGE: CallbackStageKey = 'ocr_processor'

export const REPROCESSING_STAGE_OPTIONS: Array<{ value: CallbackStageKey; label: string }> = [
  { value: 'document_splitter', label: 'Document Splitter' },
  { value: 'page_rotator', label: 'Page Rotator' },
  { value: 'ocr_processor', label: 'OCR Processor' },
  { value: 'content_dedup', label: 'Content Deduplication' },
  { value: 'metadata_extractor', label: 'Metadata Extractor' },
  { value: 'metadata_validator', label: 'Metadata Validator' },
  { value: 'rights_determinator', label: 'Rights Determinator' },
]

export const REPROCESSING_EXECUTION_STAGE_ORDER: CallbackStageKey[] = [
  ...REPROCESSING_STAGE_OPTIONS.map((option) => option.value),
  'fedora_ingester',
]

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
