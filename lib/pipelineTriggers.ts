import { randomUUID } from 'node:crypto'

import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'
import {
  CONTENT_DEDUP_STAGE,
  DOCUMENT_SPLITTER_STAGE,
  METADATA_EXTRACTOR_STAGE,
  OCR_PROCESSOR_STAGE,
  PAGE_ROTATOR_STAGE,
} from '@constants/pipeline'
import {
  getNextEligibleExecutionStep,
  getPipelineConfigForBatch,
  isPipelineBatchTerminal,
  shouldFinalizePipelineReadiness,
} from '@lib/pipelineExecution'
import { finalizePipelineBatchReadiness } from '@lib/pipelineReadiness'
import type { PipelineExecutionContextInput } from '@lib/pipelineExecutionContext'
export {
  triggerContentDedup,
  triggerDocumentSplitter,
  triggerMetadataExtractor,
  triggerOcrProcessor,
  triggerPageRotator,
  triggerFedoraIngester,
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
      GENERATED_PIPELINE_EXECUTION_MODES.RETRY,
      GENERATED_PIPELINE_EXECUTION_MODES.RERUN,
      GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS,
    ].includes(executionMode as Exclude<PipelineExecutionContextInput['executionMode'], undefined | 'normal'>)
  ) {
    return undefined
  }

  return {
    executionMode,
    operationId: execution.operationId,
    idempotencyKey: randomUUID(),
    reason: execution.reason ?? undefined,
    sourceDocumentIds: execution.sourceDocumentIds,
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
      stage === DOCUMENT_SPLITTER_STAGE ||
      stage === PAGE_ROTATOR_STAGE ||
      stage === OCR_PROCESSOR_STAGE ||
      stage === CONTENT_DEDUP_STAGE ||
      stage === METADATA_EXTRACTOR_STAGE,
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
  return isNextEligibleStep(batch, DOCUMENT_SPLITTER_STAGE, 1) || isNextEligibleStep(batch, DOCUMENT_SPLITTER_STAGE, 2)
}

export function shouldTriggerPageRotator(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, PAGE_ROTATOR_STAGE, 1) || isNextEligibleStep(batch, PAGE_ROTATOR_STAGE, 2)
}

export function shouldTriggerOcrProcessor(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, OCR_PROCESSOR_STAGE)
}

export function shouldTriggerContentDedup(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, CONTENT_DEDUP_STAGE)
}

export function shouldTriggerMetadataExtractor(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, METADATA_EXTRACTOR_STAGE)
}

export function shouldCloseProcessStream(batch: ProcessBatchStatus): boolean {
  return isPipelineBatchTerminal(batch)
}

export async function finalizePipelineReadinessIfDue(batch: ProcessBatchStatus | null): Promise<void> {
  if (!batch || !shouldFinalizePipelineReadiness(batch)) {
    return
  }

  await finalizePipelineBatchReadiness(batch.batchId)
}
