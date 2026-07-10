import { describe, expect, test } from 'vitest'

import * as processDocuments from '@lib/processDocuments'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

function buildStageStatus(status: ProcessStageStatus['status']): ProcessStageStatus {
  return {
    status,
    requestId: null,
    requestedByApp: null,
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
    underReviewCount: 0,
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
  }
}

function buildBatchStatus(batchId: string, status: ProcessStageStatus['status']): ProcessBatchStatus {
  return {
    batchId,
    batchName: batchId,
    startedBy: 'archivist@example.org',
    createdAt: '2026-07-10T00:00:00.000Z',
    pipelineRequestedStages: [],
    pipelineConfig: null,
    ingester: buildStageStatus(status),
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    rightsDeterminator: null,
  }
}

describe('processDocuments live updates', () => {
  test('returns every non-terminal batch id and excludes terminal batches', () => {
    const getLiveBatchIds = (
      processDocuments as typeof processDocuments & {
        getLiveBatchIds?: (batches: ProcessBatchStatus[]) => string[]
      }
    ).getLiveBatchIds

    expect(typeof getLiveBatchIds).toBe('function')
    if (!getLiveBatchIds) {
      return
    }

    expect(
      getLiveBatchIds([
        buildBatchStatus('batch-completed', 'completed'),
        buildBatchStatus('batch-running', 'running'),
        buildBatchStatus('batch-accepted', 'accepted'),
        buildBatchStatus('batch-failed', 'failed'),
        buildBatchStatus('batch-review-needed', 'review_needed'),
      ]),
    ).toEqual(['batch-accepted', 'batch-running'])
  })

  test('normalizes accepted process responses that use camelCase batch fields', () => {
    const normalizeAcceptedProcessStartResponse = (
      processDocuments as typeof processDocuments & {
        normalizeAcceptedProcessStartResponse?: (
          payload: Record<string, unknown>,
          fallbackBatchName: string,
        ) => { batchId: string; batchName: string }
      }
    ).normalizeAcceptedProcessStartResponse

    expect(typeof normalizeAcceptedProcessStartResponse).toBe('function')
    if (!normalizeAcceptedProcessStartResponse) {
      return
    }

    expect(
      normalizeAcceptedProcessStartResponse(
        {
          batchId: 'batch-123',
          batchName: 'Accepted Batch',
        },
        'Fallback Batch',
      ),
    ).toEqual({
      batchId: 'batch-123',
      batchName: 'Accepted Batch',
    })
  })
})
