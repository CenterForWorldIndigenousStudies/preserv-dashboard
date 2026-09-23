import { describe, expect, test } from 'vitest'

import {
  getPipelineConfigForBatch,
  getExecutionStepRuntimeStatus,
  getExecutionStepReviewWarningCount,
  getLastEnabledAutomatedExecutionStep,
  getNextEligibleExecutionStep,
  getOrchestratedExecutionPlan,
  isPipelineBatchTerminal,
  shouldFinalizePipelineReadiness,
  type PipelineStepRuntimeStatus,
} from '@lib/pipelineExecution'
import type { PipelineConfig, PipelineExecutionStep } from '@lib/pipelineConfig'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

function buildExecutionPlan(): PipelineExecutionStep[] {
  return [
    {
      id: 'step-ingester',
      stepId: 'data_ingester',
      service: 'data_ingester',
      label: 'Data Ingester',
      order: 0,
      enabled: true,
    },
    {
      id: 'step-normalize-pass-1-split',
      stepId: 'document_splitter',
      service: 'document_splitter',
      label: 'Split Pass 1',
      order: 1,
      enabled: true,
      pass: 1,
    },
    {
      id: 'step-normalize-pass-1-rotate',
      stepId: 'page_rotator',
      service: 'page_rotator',
      label: 'Rotate Pass 1',
      order: 2,
      enabled: true,
      pass: 1,
      dependsOn: ['step-normalize-pass-1-split'],
    },
    {
      id: 'step-normalize-pass-2-split',
      stepId: 'document_splitter',
      service: 'document_splitter',
      label: 'Split Pass 2',
      order: 3,
      enabled: true,
      pass: 2,
      dependsOn: ['step-normalize-pass-1-rotate'],
    },
    {
      id: 'step-normalize-pass-2-rotate',
      stepId: 'page_rotator',
      service: 'page_rotator',
      label: 'Rotate Pass 2',
      order: 4,
      enabled: true,
      pass: 2,
      dependsOn: ['step-normalize-pass-2-split'],
    },
    {
      id: 'step-ocr-processor',
      stepId: 'ocr_processor',
      service: 'ocr_processor',
      label: 'OCR Processor',
      order: 5,
      enabled: true,
      dependsOn: ['step-normalize-pass-2-rotate'],
    },
    {
      id: 'step-content-dedup',
      stepId: 'content_dedup',
      service: 'content_dedup',
      label: 'Content Dedup',
      order: 6,
      enabled: true,
      dependsOn: ['step-ocr-processor'],
    },
    {
      id: 'step-metadata-extraction',
      stepId: 'metadata_extractor',
      service: 'metadata_extractor',
      label: 'Metadata Extraction',
      order: 7,
      enabled: true,
      dependsOn: ['step-content-dedup'],
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
    needsReviewCount: 0,
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
    pipelineRequestedStages: ['document_splitter', 'page_rotator'],
    pipelineConfig,
    ingester: buildStageStatus({ status: 'completed' }),
    documentSplitter: buildStageStatus(),
    pageRotator: buildStageStatus(),
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    ...overrides,
  }
}

describe('pipelineExecution process-documents behavior', () => {
  test('uses direct metadata extraction for legacy ingest-only batches', () => {
    const batch = buildBatchStatus({ pipelineConfig: null })

    expect(getPipelineConfigForBatch(batch).metadataExtraction).toEqual({ mode: 'direct' })
  })

  test('keeps an active rollback batch live until rollback reaches a terminal state', () => {
    const batch = buildBatchStatus({ rollbackStatus: 'rollback_in_progress' })

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

    expect(getNextEligibleExecutionStep(batch)?.service).toBe('page_rotator')
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

  test('uses requested stages when pipeline config is absent', () => {
    const batch = buildBatchStatus({
      pipelineConfig: null,
      pipelineRequestedStages: ['ocr_processor'],
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
        service: 'ocr_processor',
        label: 'OCR Processor',
      }),
    ])
    expect(getNextEligibleExecutionStep(batch)?.service).toBe('ocr_processor')
  })

  test('includes the implicit data-ingester step for reprocessing executions', () => {
    const batch = buildBatchStatus({
      pipelineExecutionMode: 'reprocess',
      pipelineConfig: null,
      pipelineRequestedStages: ['ocr_processor'],
      ingester: buildStageStatus({ status: 'completed' }),
    })

    expect(getOrchestratedExecutionPlan(batch).map((step) => step.service)).toEqual([
      'data_ingester',
      'ocr_processor',
    ])
  })

  test('infers both normalization passes for a legacy reprocessing plan without config', () => {
    const batch = buildBatchStatus({
      pipelineExecutionMode: 'reprocess',
      pipelineConfig: null,
      pipelineRequestedStages: [
        'document_splitter',
        'page_rotator',
        'ocr_processor',
      ],
      ingester: buildStageStatus({ status: 'completed' }),
    })

    expect(getOrchestratedExecutionPlan(batch).map((step) => `${step.stepId}:${step.pass ?? 0}`)).toEqual([
      'data_ingester:0',
      'document_splitter:1',
      'page_rotator:1',
      'document_splitter:2',
      'page_rotator:2',
      'ocr_processor:0',
    ])
    expect(getNextEligibleExecutionStep(batch)).toMatchObject({ service: 'document_splitter', pass: 1 })
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

    expect(getNextEligibleExecutionStep(batch)?.service).toBe('metadata_extractor')
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

    expect(getNextEligibleExecutionStep(batch)?.service).toBe('ocr_processor')
  })

  test('finishes automated processing after metadata extraction completes', () => {
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

    expect(getNextEligibleExecutionStep(batch)).toBeNull()
  })

  test('identifies the last enabled automated step without Fedora handoff', () => {
    const batch = buildBatchStatus({
      metadataExtractor: buildStageStatus({ status: 'completed' }),
    })

    expect(getLastEnabledAutomatedExecutionStep(batch)).toEqual(
      expect.objectContaining({ service: 'metadata_extractor' }),
    )
  })

  test('does not treat a Fedora step as part of automated processing', () => {
    const batch = buildBatchStatus({
      pipelineConfig: {
        profileId: 'custom',
        mode: 'custom',
        metadataExtraction: { mode: 'direct' },
        executionPlan: [
          ...buildExecutionPlan(),
          {
            id: 'step-fedora-ingester',
            stepId: 'fedora_ingester',
            service: 'fedora_ingester',
            label: 'Fedora Ingester',
            order: 10,
            enabled: true,
          },
        ],
      },
      metadataExtractor: buildStageStatus({ status: 'completed' }),
    })

    expect(getLastEnabledAutomatedExecutionStep(batch)).toEqual(
      expect.objectContaining({ service: 'metadata_extractor' }),
    )
  })

  test('finalizes readiness only after the last automated step completes', () => {
    const batch = buildBatchStatus({
      pipelineConfig: {
        profileId: 'custom',
        mode: 'custom',
        metadataExtraction: { mode: 'direct' },
        executionPlan: [buildExecutionPlan()[0], buildExecutionPlan()[7]],
      },
      metadataExtractor: buildStageStatus({ status: 'completed' }),
    })

    expect(shouldFinalizePipelineReadiness(batch)).toBe(true)
    expect(
      shouldFinalizePipelineReadiness({
        ...batch,
        metadataExtractor: buildStageStatus({ status: 'running' }),
      }),
    ).toBe(false)
  })
})
