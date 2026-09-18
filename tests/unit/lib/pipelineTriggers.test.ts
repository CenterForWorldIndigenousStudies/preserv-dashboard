import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockFinalizePipelineBatchReadiness, mockTriggerMetadataExtractor, mockUpdateMany } = vi.hoisted(() => ({
  mockFinalizePipelineBatchReadiness: vi.fn(),
  mockTriggerMetadataExtractor: vi.fn(),
  mockUpdateMany: vi.fn(),
}))

vi.mock('@lib/pipelineReadiness', () => ({
  finalizePipelineBatchReadiness: mockFinalizePipelineBatchReadiness,
}))

vi.mock('@lib/db', () => ({
  db: {
    batches: {
      updateMany: mockUpdateMany,
    },
  },
}))

vi.mock('@lib/pipelineTriggerRequests', () => ({
  triggerMetadataExtractor: mockTriggerMetadataExtractor,
  triggerContentDedup: vi.fn(),
  triggerDocumentSplitter: vi.fn(),
  triggerOcrProcessor: vi.fn(),
  triggerPageRotator: vi.fn(),
}))

import {
  finalizePipelineReadinessIfDue,
  getPipelineContinuationContext,
  triggerMetadataExtractor,
} from '@lib/pipelineTriggers'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatchStatus(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-07-03T00:00:00.000Z',
    pipelineRequestedStages: ['metadata-extraction'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    ...overrides,
  }
}

describe('pipelineTriggers', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('preserves rerun execution context for downstream callbacks', () => {
    const batch = buildBatchStatus({
      currentExecution: {
        executionMode: 'rerun',
        operationId: 'operation-1',
        idempotencyKey: 'idempotency-1',
        stage: 'metadata_extractor',
        reason: 'Use the updated extractor.',
        sourceDocumentIds: ['document-1'],
      },
    })

    const context = getPipelineContinuationContext(batch)
    expect(context).toMatchObject({
      executionMode: 'rerun',
      operationId: 'operation-1',
      reason: 'Use the updated extractor.',
      sourceDocumentIds: ['document-1'],
    })
    expect(typeof context?.idempotencyKey).toBe('string')
  })

  it('preserves the pass-aware reprocessing pipeline config for downstream callbacks', () => {
    const pipelineConfig = {
      profileId: 'custom' as const,
      mode: 'custom' as const,
      metadataExtraction: { mode: 'direct' as const },
      executionPlan: [
        {
          id: 'step-normalize-pass-2-split',
          stepId: 'normalize-pass-2' as const,
          service: 'document-splitter' as const,
          label: 'Split Pass 2',
          order: 1,
          enabled: true,
          pass: 2 as const,
        },
      ],
    }
    const batch = buildBatchStatus({
      pipelineExecutionMode: 'reprocess',
      pipelineConfig,
      currentExecution: {
        executionMode: 'reprocess',
        operationId: 'operation-1',
        idempotencyKey: 'idempotency-1',
        stage: 'document_splitter',
        reason: 'Run normalization again.',
        sourceDocumentIds: ['document-1'],
      },
    })

    expect(getPipelineContinuationContext(batch)?.pipelineConfig).toEqual(pipelineConfig)
  })

  it('does not add execution context to normal downstream callbacks', () => {
    expect(getPipelineContinuationContext(buildBatchStatus())).toBeUndefined()
  })

  it('delegates metadata extractor triggers to pipelineTriggerRequests', async () => {
    const batch = buildBatchStatus()
    mockTriggerMetadataExtractor.mockResolvedValue(undefined)

    await triggerMetadataExtractor(batch)

    expect(mockTriggerMetadataExtractor).toHaveBeenCalledWith(batch)
  })

  it('marks a batch complete after its final automated stage completes', async () => {
    mockFinalizePipelineBatchReadiness.mockResolvedValue(undefined)

    const batch = {
      batchId: 'batch-1',
      lifecycleStatus: 'running',
      publicationStatus: 'not_started',
      pipelineRequestedStages: ['metadata-extraction'],
      pipelineConfig: {
        profileId: 'custom',
        mode: 'custom',
        metadataExtraction: { mode: 'direct' },
        executionPlan: [
          { id: 'step-ingester', stepId: 'ingester', service: 'ingester', label: 'Ingest', order: 0, enabled: true },
          {
            id: 'step-metadata-extraction',
            stepId: 'metadata-extraction',
            service: 'metadata-extraction',
            label: 'Metadata Extraction',
            order: 1,
            enabled: true,
            dependsOn: ['step-ingester'],
          },
        ],
      },
      ingester: { status: 'completed' },
      metadataExtractor: { status: 'completed' },
    } as ProcessBatchStatus

    await finalizePipelineReadinessIfDue(batch)

    expect(mockFinalizePipelineBatchReadiness).toHaveBeenCalledWith('batch-1')
    expect(mockUpdateMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        id: 'batch-1',
        lifecycle_status: { in: ['queued', 'running'] },
        publication_status: 'not_started',
      },
      data: { lifecycle_status: 'complete' },
    })
  })
})
