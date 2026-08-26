import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetProcessBatchStatus,
  mockMarkProcessStageCallbackReceived,
  mockShouldTriggerPageRotator,
  mockShouldTriggerOcrProcessor,
  mockShouldTriggerContentDedup,
  mockShouldTriggerMetadataExtractor,
  mockTriggerPageRotator,
  mockTriggerOcrProcessor,
  mockTriggerContentDedup,
  mockTriggerMetadataExtractor,
  mockFinalizePipelineReadinessIfDue,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockMarkProcessStageCallbackReceived: vi.fn(),
  mockShouldTriggerPageRotator: vi.fn(),
  mockShouldTriggerOcrProcessor: vi.fn(),
  mockShouldTriggerContentDedup: vi.fn(),
  mockShouldTriggerMetadataExtractor: vi.fn(),
  mockTriggerPageRotator: vi.fn(),
  mockTriggerOcrProcessor: vi.fn(),
  mockTriggerContentDedup: vi.fn(),
  mockTriggerMetadataExtractor: vi.fn(),
  mockFinalizePipelineReadinessIfDue: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
  markProcessStageCallbackReceived: mockMarkProcessStageCallbackReceived,
}))

vi.mock('@lib/pipelineTriggers', () => ({
  getPipelineContinuationContext: () => undefined,
  shouldTriggerPageRotator: mockShouldTriggerPageRotator,
  shouldTriggerOcrProcessor: mockShouldTriggerOcrProcessor,
  shouldTriggerContentDedup: mockShouldTriggerContentDedup,
  shouldTriggerMetadataExtractor: mockShouldTriggerMetadataExtractor,
  triggerPageRotator: mockTriggerPageRotator,
  triggerOcrProcessor: mockTriggerOcrProcessor,
  triggerContentDedup: mockTriggerContentDedup,
  triggerMetadataExtractor: mockTriggerMetadataExtractor,
  finalizePipelineReadinessIfDue: mockFinalizePipelineReadinessIfDue,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '@api/pipeline/document-splitter/callback/route'
import { DOCUMENT_SPLITTER_CALLBACK_PATH } from '@constants/paths'

describe('document-splitter callback route', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'document-splitter-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('triggers metadata extractor when it is the next eligible stage', async () => {
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-1',
      batchName: 'Batch 1',
      startedBy: 'archivist@example.org',
    })
    mockShouldTriggerPageRotator.mockReturnValue(false)
    mockShouldTriggerOcrProcessor.mockReturnValue(false)
    mockShouldTriggerContentDedup.mockReturnValue(false)
    mockShouldTriggerMetadataExtractor.mockReturnValue(true)
    mockTriggerMetadataExtractor.mockResolvedValue(undefined)

    const request = new NextRequest(`http://localhost${DOCUMENT_SPLITTER_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer document-splitter-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: 'batch-1',
        request_id: 'request-1',
        status: 'completed',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(204)
    expect(mockTriggerMetadataExtractor).toHaveBeenCalledTimes(1)
    expect(mockTriggerPageRotator).not.toHaveBeenCalled()
    expect(mockTriggerOcrProcessor).not.toHaveBeenCalled()
    expect(mockTriggerContentDedup).not.toHaveBeenCalled()
  })
})
