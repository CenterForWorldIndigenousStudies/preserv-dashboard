import {
  CONTENT_DEDUP_SERVICE,
  DATA_INGESTER_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  FEDORA_INGESTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
} from '@constants/pipeline'
import type { CallbackStageKey, ProcessBatchStatus } from 'types/pipelineContracts'

export const PIPELINE_STAGE_PROPERTIES: Record<CallbackStageKey, keyof ProcessBatchStatus> = {
  [DATA_INGESTER_SERVICE]: 'ingester',
  [DOCUMENT_SPLITTER_SERVICE]: 'documentSplitter',
  [PAGE_ROTATOR_SERVICE]: 'pageRotator',
  [OCR_PROCESSOR_SERVICE]: 'ocrProcessor',
  [CONTENT_DEDUP_SERVICE]: 'contentDedup',
  [METADATA_EXTRACTOR_SERVICE]: 'metadataExtractor',
  [FEDORA_INGESTER_SERVICE]: 'fedoraIngester',
}
