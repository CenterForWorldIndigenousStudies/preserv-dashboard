import { describe, expect, it } from 'vitest'

import type { PipelineConfig, PipelineExecutionStep } from '@lib/pipelineConfig'
import { getNextEligibleExecutionStep, type PipelineStepRuntimeStatus } from '@lib/pipelineExecution'
import { shouldTriggerDocumentSplitter, shouldTriggerPageRotator } from '@lib/pipelineTriggers'
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
    },
    {
      id: 'step-normalize-pass-2-split',
      stepId: 'normalize-pass-2',
      service: 'document-splitter',
      label: 'Split Pass 2',
      order: 3,
      enabled: true,
      pass: 2,
    },
    {
      id: 'step-normalize-pass-2-rotate',
      stepId: 'normalize-pass-2',
      service: 'page-rotator',
      label: 'Rotate Pass 2',
      order: 4,
      enabled: true,
      pass: 2,
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
    ...overrides,
  }
}

function buildBatchStatus(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  const pipelineConfig: PipelineConfig = {
    profileId: 'custom',
    mode: 'custom',
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

function expectNextStep(batch: ProcessBatchStatus, expected: { service: string; pass?: 1 | 2 } | null): void {
  const nextStep = getNextEligibleExecutionStep(batch)
  if (expected === null) {
    expect(nextStep).toBeNull()
    return
  }

  expect(nextStep).not.toBeNull()
  expect(nextStep?.service).toBe(expected.service)
  expect(nextStep?.pass).toBe(expected.pass)
}

describe('normalization forward-processing orchestration', () => {
  it('advances from split pass 1 to rotate pass 1', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        completedPasses: [1],
      }),
    })

    expectNextStep(batch, { service: 'page-rotator', pass: 1 })
    expect(shouldTriggerPageRotator(batch)).toBe(true)
    expect(shouldTriggerDocumentSplitter(batch)).toBe(false)
  })

  it('advances from split pass 1 when review is needed but the pass completed', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        reviewNeededCount: 1,
        completedPasses: [1],
      }),
    })

    expectNextStep(batch, { service: 'page-rotator', pass: 1 })
    expect(shouldTriggerPageRotator(batch)).toBe(true)
    expect(shouldTriggerDocumentSplitter(batch)).toBe(false)
  })

  it('advances from rotate pass 1 to split pass 2', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        completedPasses: [1],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        completedPasses: [1],
      }),
    })

    expectNextStep(batch, { service: 'document-splitter', pass: 2 })
    expect(shouldTriggerDocumentSplitter(batch)).toBe(true)
    expect(shouldTriggerPageRotator(batch)).toBe(false)
  })

  it('advances from split pass 2 to rotate pass 2', () => {
    const batch = buildBatchStatus({
      documentSplitter: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 2,
        completedPasses: [1, 2],
      }),
      pageRotator: buildStageStatus({
        status: 'completed' satisfies PipelineStepRuntimeStatus,
        currentPass: 1,
        completedPasses: [1],
      }),
    })

    expectNextStep(batch, { service: 'page-rotator', pass: 2 })
    expect(shouldTriggerPageRotator(batch)).toBe(true)
    expect(shouldTriggerDocumentSplitter(batch)).toBe(false)
  })
})
