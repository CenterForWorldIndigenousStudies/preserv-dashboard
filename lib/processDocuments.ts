import type { PipelineConfig } from '@lib/pipelineConfig'
import { isPipelineBatchTerminal } from '@lib/pipelineExecution'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

export function upsertBatchStatus(batches: ProcessBatchStatus[], nextBatch: ProcessBatchStatus): ProcessBatchStatus[] {
  const withoutExisting = batches.filter((batch) => batch.batchId !== nextBatch.batchId)
  return [nextBatch, ...withoutExisting].slice(0, 25)
}

export function getLiveBatchIds(batches: ProcessBatchStatus[]): string[] {
  return batches
    .filter((batch) => !isPipelineBatchTerminal(batch))
    .map((batch) => batch.batchId)
    .sort()
}

export function normalizeAcceptedProcessStartResponse(
  payload: Record<string, unknown>,
  fallbackBatchName: string,
): { batchId: string; batchName: string } {
  const batchId =
    typeof payload.batchId === 'string'
      ? payload.batchId.trim()
      : typeof payload.batch_id === 'string'
        ? payload.batch_id.trim()
        : ''

  const batchName =
    typeof payload.batchName === 'string'
      ? payload.batchName.trim()
      : typeof payload.batch_name === 'string'
        ? payload.batch_name.trim()
        : ''

  return {
    batchId,
    batchName: batchName || fallbackBatchName,
  }
}

interface BuildAcceptedBatchStatusArgs {
  batchId: string
  batchName: string
  startedBy: string
  submittedAt: string
  selectedFolderIds: string[]
  collectionName: string
  collectionNotes: string
  pipelineRequestedStages: string[]
  pipelineConfig: PipelineConfig
}

export function buildAcceptedBatchStatus({
  batchId,
  batchName,
  startedBy,
  submittedAt,
  selectedFolderIds,
  collectionName,
  collectionNotes,
  pipelineRequestedStages,
  pipelineConfig,
}: BuildAcceptedBatchStatusArgs): ProcessBatchStatus {
  return {
    batchId,
    batchName,
    startedBy,
    createdAt: submittedAt,
    startedAt: submittedAt,
    pipelineRequestedStages,
    pipelineConfig,
    ingester: {
      status: 'accepted',
      mode: null,
      requestId: null,
      requestedByApp: 'preserv-dashboard',
      initiatedAt: submittedAt,
      startedAt: null,
      completedAt: null,
      lastTransitionAt: submittedAt,
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
      sourceFolderIds: selectedFolderIds,
      collectionName: collectionName.trim() || null,
      collectionNotes: collectionNotes.trim() || null,
      openaiBatchWave1: null,
      openaiBatchWave2: null,
    },
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    rightsDeterminator: null,
  }
}
