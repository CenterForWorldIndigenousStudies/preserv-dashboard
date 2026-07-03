import { describe, expect, it, vi } from 'vitest'

const {
  mockGetProcessBatchStatus,
  mockTriggerMetadataExtractorRequest,
  mockTriggerMetadataValidator,
} = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockTriggerMetadataExtractorRequest: vi.fn(),
  mockTriggerMetadataValidator: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
}))

vi.mock('@lib/pipelineTriggerRequests', () => ({
  triggerMetadataExtractor: mockTriggerMetadataExtractorRequest,
  triggerMetadataValidator: mockTriggerMetadataValidator,
  triggerContentDedup: vi.fn(),
  triggerDocumentSplitter: vi.fn(),
  triggerOcrProcessor: vi.fn(),
  triggerPageRotator: vi.fn(),
}))

import { triggerMetadataExtractor } from '@lib/pipelineTriggers'
import type { PipelineConfig } from '@lib/pipelineConfig'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatchStatus(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  const pipelineConfig: PipelineConfig = {
    profileId: 'custom',
    mode: 'custom',
    executionPlan: [
      {
        id: 'step-ingester',
        stepId: 'ingester',
        service: 'ingester',
        label: 'Ingest',
        order: 0,
        enabled: true,
      },
      {
        id: 'step-metadata-extraction',
        stepId: 'metadata-extraction',
        service: 'metadata-extraction',
        label: 'Metadata Extraction',
        order: 1,
        enabled: true,
        dependsOn: ['step-ingester'],
      },
      {
        id: 'step-metadata-validation',
        stepId: 'metadata-validation',
        service: 'metadata-validation',
        label: 'Metadata Validation',
        order: 2,
        enabled: true,
        dependsOn: ['step-metadata-extraction'],
      },
    ],
  }

  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-07-03T00:00:00.000Z',
    pipelineRequestedStages: ['metadata-extraction', 'metadata-validation'],
    pipelineConfig,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    ...overrides,
  }
}

describe('pipelineTriggers', () => {
  it('triggers metadata validator after synchronous extractor completion when validator is next eligible', async () => {
    const initialBatch = buildBatchStatus()
    const updatedBatch = buildBatchStatus({
      metadataExtractor: {
        status: 'completed',
        requestId: 'request-1',
        requestedByApp: 'preserv-dashboard',
        initiatedAt: '2026-07-03T00:00:00.000Z',
        startedAt: '2026-07-03T00:00:00.000Z',
        completedAt: '2026-07-03T00:00:05.000Z',
        lastTransitionAt: '2026-07-03T00:00:05.000Z',
        error: null,
        callbackDeliveryStatus: null,
        callbackNotifiedAt: null,
        callbackReceivedAt: null,
        callbackHttpStatus: null,
        callbackErrorType: null,
        callbackErrorMessage: null,
        processedCount: 4,
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
        extractedCount: 4,
        metadataValidatedCount: 0,
        underReviewCount: 0,
        versionedCount: 0,
        resolvedCount: 0,
        skippedCount: 0,
        reviewNeededCount: 0,
        failedCount: 0,
        currentPass: 1,
        maxPasses: 1,
        completedPasses: [1],
        sourceFolderIds: [],
        collectionName: null,
        collectionNotes: null,
      },
    })

    mockTriggerMetadataExtractorRequest.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue(updatedBatch)
    mockTriggerMetadataValidator.mockResolvedValue(undefined)

    await triggerMetadataExtractor(initialBatch)

    expect(mockTriggerMetadataExtractorRequest).toHaveBeenCalledWith(initialBatch)
    expect(mockGetProcessBatchStatus).toHaveBeenCalledWith('batch-1')
    expect(mockTriggerMetadataValidator).toHaveBeenCalledWith(updatedBatch)
  })
})
