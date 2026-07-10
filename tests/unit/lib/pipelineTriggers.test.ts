import { describe, expect, it, vi } from 'vitest'

const {
  mockTriggerMetadataExtractor,
  mockTriggerMetadataValidator,
  mockTriggerRightsDeterminator,
} = vi.hoisted(() => ({
  mockTriggerMetadataExtractor: vi.fn(),
  mockTriggerMetadataValidator: vi.fn(),
  mockTriggerRightsDeterminator: vi.fn(),
}))

vi.mock('@lib/pipelineTriggerRequests', () => ({
  triggerMetadataExtractor: mockTriggerMetadataExtractor,
  triggerMetadataValidator: mockTriggerMetadataValidator,
  triggerRightsDeterminator: mockTriggerRightsDeterminator,
  triggerContentDedup: vi.fn(),
  triggerDocumentSplitter: vi.fn(),
  triggerOcrProcessor: vi.fn(),
  triggerPageRotator: vi.fn(),
}))

import {
  triggerMetadataExtractor,
  triggerMetadataValidator,
  triggerRightsDeterminator,
} from '@lib/pipelineTriggers'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatchStatus(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-07-03T00:00:00.000Z',
    pipelineRequestedStages: ['metadata-extraction', 'metadata-validation', 'rights-determinator'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    rightsDeterminator: null,
    ...overrides,
  }
}

describe('pipelineTriggers', () => {
  it('delegates metadata extractor triggers to pipelineTriggerRequests', async () => {
    const batch = buildBatchStatus()
    mockTriggerMetadataExtractor.mockResolvedValue(undefined)

    await triggerMetadataExtractor(batch)

    expect(mockTriggerMetadataExtractor).toHaveBeenCalledWith(batch)
  })

  it('delegates metadata validator triggers to pipelineTriggerRequests', async () => {
    const batch = buildBatchStatus()
    mockTriggerMetadataValidator.mockResolvedValue(undefined)

    await triggerMetadataValidator(batch)

    expect(mockTriggerMetadataValidator).toHaveBeenCalledWith(batch)
  })

  it('delegates rights determinator triggers to pipelineTriggerRequests', async () => {
    const batch = buildBatchStatus()
    mockTriggerRightsDeterminator.mockResolvedValue(undefined)

    await triggerRightsDeterminator(batch)

    expect(mockTriggerRightsDeterminator).toHaveBeenCalledWith(batch)
  })
})
