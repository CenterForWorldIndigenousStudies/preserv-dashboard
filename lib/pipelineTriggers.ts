import { randomUUID } from 'node:crypto'

import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'
import {
  CONTENT_DEDUP_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
} from '@constants/pipeline'
import {
  getNextEligibleExecutionStep,
  getPipelineConfigForBatch,
  isPipelineBatchTerminal,
  shouldFinalizePipelineReadiness,
} from '@lib/pipelineExecution'
import { finalizePipelineBatchReadiness } from '@lib/pipelineReadiness'
import { markProcessBatchComplete } from '@lib/processBatches'
import type { PipelineExecutionContextInput } from '@lib/pipelineExecutionContext'
export {
  triggerContentDedup,
  triggerDocumentSplitter,
  triggerMetadataExtractor,
  triggerOcrProcessor,
  triggerPageRotator,
  triggerFedoraIngester,
  triggerDataIngesterReprocess,
} from '@lib/pipelineTriggerRequests'
import type { PipelineExecutionStep } from '@lib/pipelineConfig'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

export function getPipelineContinuationContext(batch: ProcessBatchStatus): PipelineExecutionContextInput | undefined {
  const execution = batch.currentExecution
  const executionMode = execution?.executionMode as Exclude<PipelineExecutionContextInput['executionMode'], undefined>
  if (
    !execution?.operationId ||
    !execution.idempotencyKey ||
    !execution.executionMode ||
    ![
      GENERATED_PIPELINE_EXECUTION_MODES.NORMAL,
      GENERATED_PIPELINE_EXECUTION_MODES.RETRY,
      GENERATED_PIPELINE_EXECUTION_MODES.RERUN,
      GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS,
    ].includes(executionMode)
  ) {
    return undefined
  }

  return {
    executionMode,
    operationId: execution.operationId,
    idempotencyKey: randomUUID(),
    reason: execution.reason ?? undefined,
    sourceDocumentIds: execution.sourceDocumentIds,
    ...(executionMode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS ? { sourceBatchId: batch.batchId } : {}),
    requestedStages: batch.pipelineRequestedStages as PipelineExecutionContextInput['requestedStages'],
    pipelineConfig: batch.pipelineConfig ?? undefined,
  }
}

function normalizeRequestedStages(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0)
}

export function normalizeRequestedProcessStages(value: unknown): string[] {
  return normalizeRequestedStages(value).filter(
    (stage) =>
      stage === DOCUMENT_SPLITTER_SERVICE ||
      stage === PAGE_ROTATOR_SERVICE ||
      stage === OCR_PROCESSOR_SERVICE ||
      stage === CONTENT_DEDUP_SERVICE ||
      stage === METADATA_EXTRACTOR_SERVICE,
  )
}

function isNextEligibleStep(batch: ProcessBatchStatus, stage: PipelineExecutionStep['service'], pass?: 1 | 2): boolean {
  const nextStep = getNextEligibleExecutionStep(batch)
  if (!nextStep) {
    return false
  }

  return nextStep.service === stage && nextStep.pass === pass
}

export function shouldTriggerDocumentSplitter(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, DOCUMENT_SPLITTER_SERVICE, 1) || isNextEligibleStep(batch, DOCUMENT_SPLITTER_SERVICE, 2)
}

export function shouldTriggerPageRotator(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, PAGE_ROTATOR_SERVICE, 1) || isNextEligibleStep(batch, PAGE_ROTATOR_SERVICE, 2)
}

export function shouldTriggerOcrProcessor(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, OCR_PROCESSOR_SERVICE)
}

export function shouldTriggerContentDedup(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, CONTENT_DEDUP_SERVICE)
}

export function shouldTriggerMetadataExtractor(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, METADATA_EXTRACTOR_SERVICE)
}

export function shouldCloseProcessStream(batch: ProcessBatchStatus): boolean {
  return isPipelineBatchTerminal(batch)
}

export async function finalizePipelineReadinessIfDue(batch: ProcessBatchStatus | null): Promise<void> {
  if (!batch || !shouldFinalizePipelineReadiness(batch)) {
    return
  }

  await finalizePipelineBatchReadiness(batch.batchId)
  await markProcessBatchComplete(batch.batchId)
}
