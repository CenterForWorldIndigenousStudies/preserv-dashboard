import type { PipelineExecutionStep } from '@lib/pipelineConfig'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

export function createPendingProcessStage(): ProcessStageStatus {
  return {
    status: 'pending',
    mode: null,
    requestId: null,
    requestedByApp: 'preserv-dashboard',
    initiatedAt: null,
    startedAt: null,
    completedAt: null,
    lastTransitionAt: null,
    error: null,
    callbackDeliveryStatus: null,
    callbackNotifiedAt: null,
    callbackReceivedAt: null,
    callbackHttpStatus: null,
    callbackErrorType: null,
    callbackErrorMessage: null,
    processedCount: 0,
    ingestedCount: 0,
    duplicateCount: 0,
    exactDuplicateCount: 0,
    skippedSameOriginCount: 0,
    splitCount: 0,
    childCount: 0,
    passedThroughCount: 0,
    rotatedCount: 0,
    normalizedCount: 0,
    ocrCompletedCount: 0,
    extractedCount: 0,
    metadataValidatedCount: 0,
    rightsDeterminedCount: 0,
    needsReviewCount: 0,
    versionedCount: 0,
    resolvedCount: 0,
    skippedCount: 0,
    reviewNeededCount: 0,
    failedCount: 0,
    currentPass: 1,
    maxPasses: 1,
    completedPasses: [],
    sourceFolderIds: [],
    collectionName: null,
    collectionNotes: null,
    openaiBatchWave1: null,
    openaiBatchWave2: null,
  }
}

export function shouldShowPendingProcessStage(
  batch: ProcessBatchStatus,
  stage: ProcessStageStatus | null | undefined,
  service: PipelineExecutionStep['service'],
): boolean {
  if (stage) {
    return false
  }

  if (batch.pipelineRequestedStages.includes(service)) {
    return true
  }

  return batch.pipelineConfig?.executionPlan.some((step) => step.enabled && step.service === service) ?? false
}
