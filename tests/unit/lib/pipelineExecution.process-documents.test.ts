import { describe, expect, test } from 'vitest'

import {
  getPipelineConfigForBatch,
  getExecutionStepRuntimeStatus,
  getExecutionStepReviewWarningCount,
  getNextEligibleExecutionStep,
  getOrchestratedExecutionPlan,
  isPipelineBatchTerminal,
  type PipelineStepRuntimeStatus,
} from '@lib/pipelineExecution'
import type { PipelineConfig, PipelineExecutionStep } from '@lib/pipelineConfig'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

function buildExecutionPlan(): PipelineExecutionStep[] {
  return [
    {
      id: 'step-ingester',
      stepId: 'ingester',
      service: 'ingester',
      label: 'Ingest',
      order: 0,
      enabled: true,
    },
    {
      id: 'step-normalize-pass-1-split',
      stepId: 'normalize-pass-1',
      service: 'document-splitter',
      label: 'Split Pass 1',
      order: 1,
      enabled: true,
      pass: 1,
    },
    {
      id: 'step-normalize-pass-1-rotate',
      stepId: 'normalize-pass-1',
      service: 'page-rotator',
      label: 'Rotate Pass 1',
      order: 2,
      enabled: true,
      pass: 1,
      dependsOn: ['step-normalize-pass-1-split'],
    },
    {
      id: 'step-normalize-pass-2-split',
      stepId: 'normalize-pass-2',
      service: 'document-splitter',
      label: 'Split Pass 2',
      order: 3,
      enabled: true,
      pass: 2,
      dependsOn: ['step-normalize-pass-1-rotate'],
    },
    {
      id: 'step-normalize-pass-2-rotate',
      stepId: 'normalize-pass-2',
      service: 'page-rotator',
      label: 'Rotate Pass 2',
      order: 4,
      enabled: true,
      pass: 2,
      dependsOn: ['step-normalize-pass-2-split'],
    },
    {
      id: 'step-ocr-processor',
      stepId: 'ocr-processor',
      service: 'ocr-processor',
      label: 'OCR Processor',
      order: 5,
      enabled: true,
      dependsOn: ['step-normalize-pass-2-rotate'],
    },
    {
      id: 'step-content-dedup',
      stepId: 'content-dedup',
      service: 'content-dedup',
      label: 'Content Dedup',
      order: 6,
      enabled: true,
      dependsOn: ['step-ocr-processor'],
    },
    {
      id: 'step-metadata-extraction',
      stepId: 'metadata-extraction',
      service: 'metadata-extraction',
      label: 'Metadata Extraction',
      order: 7,
      enabled: true,
      dependsOn: ['step-content-dedup'],
    },
    {
      id: 'step-metadata-validation',
      stepId: 'metadata-validation',
      service: 'metadata-validation',
      label: 'Metadata Validation',
      order: 8,
      enabled: true,
      dependsOn: ['step-metadata-extraction'],
    },
    {
      id: 'step-rights-determinator',
      stepId: 'rights-determinator',
      service: 'rights-determinator',
      label: 'Rights Determinator',
      order: 9,
      enabled: true,
      dependsOn: ['step-metadata-validation'],
    },
  ]
}

function buildStageStatus(overrides: Partial<ProcessStageStatus> = {}): ProcessStageStatus {
  return {
    status: null,
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
    maxPasses: 2,
    completedPasses: [],
    sourceFolderIds: [],
    collectionName: null,
    collectionNotes: null,
    mode: null,
    openaiBatchWave1: null,
    openaiBatchWave2: null,
    ...overrides,
  }
}

function buildBatchStatus(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  const pipelineConfig: PipelineConfig = {
    profileId: 'custom',
    mode: 'custom',
    metadataExtraction: { mode: 'direct' },
    executionPlan: buildExecutionPlan(),
  }

  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-05-17T00:00:00.000Z',
    pipelineRequestedStages: ['document-splitter', 'page-rotator'],
    pipelineConfig,
    ingester: buildStageStatus({ status: 'completed' }),
    documentSplitter: buildStageStatus(),
    pageRotator: buildStageStatus(),
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    rightsDeterminator: null,
    ...overrides,
  }
}

describe('pipelineExecution process-documents behavior', () => {
  test('uses direct metadata extraction for legacy ingest-only batches', () => {
    const batch = buildBatchStatus({ pipelineConfig: null })

    expect(getPipelineConfigForBatch(batch).metadataExtraction).toEqual({ mode: 'direct' })
  })

  test('keeps an active rollback batch live until rollback reaches a terminal state', () => {
    const batch = buildBatchStatus({ rollbackStatus: 'reverting' })

    expect(isPipelineBatchTerminal(batch)).toBe(false)
    expect(isPipelineBatchTerminal({ ...batch, rollbackStatus: 'failed', lifecycleStatus: 'rollback_failed' })).toBe(
      true,
    )
  })

  test('returns rotate pass 2 as next eligible step after split pass 2 completes', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [1, 2],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        maxPasses: 2,
        completedPasses: [1],
      }),
    })

    expect(getNextEligibleExecutionStep(batch)?.service).toBe('page-rotator')
    expect(getNextEligibleExecutionStep(batch)?.pass).toBe(2)
  })

  test('unlocks dependent steps when a completed stage still has review warnings', () => {
    const splitPassOneStep = buildExecutionPlan()[1]
    const rotatePassOneStep = buildExecutionPlan()[2]
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        reviewNeededCount: 1,
        completedPasses: [1],
        maxPasses: 2,
      }),
    })

    expect(getExecutionStepRuntimeStatus(batch, splitPassOneStep)).toBe('completed')
    expect(getExecutionStepReviewWarningCount(batch, splitPassOneStep)).toBe(1)
    expect(getNextEligibleExecutionStep(batch)).toEqual(rotatePassOneStep)
  })

  test('treats a pass as pending when the stage is running a different pass', () => {
    const executionStep = buildExecutionPlan()[3]
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'running' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        completedPasses: [1],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        completedPasses: [1],
      }),
    })

    expect(getExecutionStepRuntimeStatus(batch, executionStep)).toBe('pending')
  })

  test('does not infer normalize pass 2 from requested stages when pipeline config is absent', () => {
    const batch = buildBatchStatus({
      pipelineConfig: null,
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        maxPasses: 1,
        completedPasses: [1],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        maxPasses: 1,
        completedPasses: [1],
      }),
    })

    expect(getOrchestratedExecutionPlan(batch)).toEqual([
      expect.objectContaining({
        service: 'ingester',
      }),
    ])
    expect(getNextEligibleExecutionStep(batch)).toBeNull()
  })

  test('returns metadata extraction as next eligible step after content dedup completes', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [1, 2],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [1, 2],
      }),
      ocrProcessor: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
      contentDedup: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
    })

    expect(getNextEligibleExecutionStep(batch)?.service).toBe('metadata-extraction')
  })

  test('returns ocr processor as next eligible step when final rotate pass is completed without completed_passes metadata', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [1, 2],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [],
      }),
    })

    expect(getNextEligibleExecutionStep(batch)?.service).toBe('ocr-processor')
  })

  test('returns metadata validation as next eligible step after metadata extraction completes', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [1, 2],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [1, 2],
      }),
      ocrProcessor: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
      contentDedup: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
      metadataExtractor: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
    })

    expect(getNextEligibleExecutionStep(batch)?.service).toBe('metadata-validation')
  })

  test('returns rights determinator as next eligible step after metadata validation completes', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [1, 2],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        maxPasses: 2,
        completedPasses: [1, 2],
      }),
      ocrProcessor: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
      contentDedup: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
      metadataExtractor: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
      metadataValidator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
      }),
    })

    expect(getNextEligibleExecutionStep(batch)?.service).toBe('rights-determinator')
  })
})
