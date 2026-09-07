import type { PipelineExecutionContextInput } from '@lib/pipelineExecutionContext'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

export interface PipelineTriggerAcceptedResponse {
  batchId: string | null
  status: string | null
  service: string | null
}

function trigger(service: string): Promise<PipelineTriggerAcceptedResponse> {
  return Promise.resolve({ batchId: null, status: 'stubbed', service })
}

export function triggerDocumentSplitter(
  _batch: ProcessBatchStatus,
  _executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return trigger('document_splitter')
}

export function triggerPageRotator(
  _batch: ProcessBatchStatus,
  _executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return trigger('page_rotator')
}

export function triggerOcrProcessor(
  _batch: ProcessBatchStatus,
  _executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return trigger('ocr_processor')
}

export function triggerContentDedup(
  _batch: ProcessBatchStatus,
  _executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return trigger('content_dedup')
}

export function triggerMetadataExtractor(
  _batch: ProcessBatchStatus,
  _executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return trigger('metadata_extractor')
}

export function triggerMetadataValidator(
  _batch: ProcessBatchStatus,
  _executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return trigger('metadata_validator')
}

export function triggerRightsDeterminator(
  _batch: ProcessBatchStatus,
  _executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return trigger('rights_determinator')
}

export function triggerFedoraIngester(
  _batch: ProcessBatchStatus,
  _executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return trigger('fedora_ingester')
}
