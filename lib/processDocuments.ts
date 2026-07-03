import type { PipelineConfig } from '@lib/pipelineConfig'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

export function upsertBatchStatus(batches: ProcessBatchStatus[], nextBatch: ProcessBatchStatus): ProcessBatchStatus[] {
  const withoutExisting = batches.filter((batch) => batch.batchId !== nextBatch.batchId)
  return [nextBatch, ...withoutExisting].slice(0, 25)
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
    pipelineRequestedStages,
    pipelineConfig,
    ingester: {
      status: 'accepted',
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
      underReviewCount: 0,
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
