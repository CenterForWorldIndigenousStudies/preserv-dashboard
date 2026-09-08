import { describe, expect, it, vi } from 'vitest'

const {
  mockTriggerMetadataExtractor,
} = vi.hoisted(() => ({
  mockTriggerMetadataExtractor: vi.fn(),
}))

vi.mock('@lib/pipelineTriggerRequests', () => ({
  triggerMetadataExtractor: mockTriggerMetadataExtractor,
  triggerContentDedup: vi.fn(),
  triggerDocumentSplitter: vi.fn(),
  triggerOcrProcessor: vi.fn(),
  triggerPageRotator: vi.fn(),
}))

import {
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

  it('does not add execution context to normal downstream callbacks', () => {
    expect(getPipelineContinuationContext(buildBatchStatus())).toBeUndefined()
  })

  it('delegates metadata extractor triggers to pipelineTriggerRequests', async () => {
    const batch = buildBatchStatus()
    mockTriggerMetadataExtractor.mockResolvedValue(undefined)

    await triggerMetadataExtractor(batch)

    expect(mockTriggerMetadataExtractor).toHaveBeenCalledWith(batch)
  })

})
