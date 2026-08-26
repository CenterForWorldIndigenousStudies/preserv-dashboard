import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetProcessBatchStatus,
  mockMarkProcessStageCallbackReceived,
  mockShouldTriggerDocumentSplitter,
  mockShouldTriggerPageRotator,
  mockShouldTriggerOcrProcessor,
  mockShouldTriggerContentDedup,
  mockShouldTriggerMetadataExtractor,
  mockTriggerDocumentSplitter,
  mockTriggerPageRotator,
  mockTriggerOcrProcessor,
  mockTriggerContentDedup,
  mockTriggerMetadataExtractor,
  mockFinalizePipelineReadinessIfDue,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockMarkProcessStageCallbackReceived: vi.fn(),
  mockShouldTriggerDocumentSplitter: vi.fn(),
  mockShouldTriggerPageRotator: vi.fn(),
  mockShouldTriggerOcrProcessor: vi.fn(),
  mockShouldTriggerContentDedup: vi.fn(),
  mockShouldTriggerMetadataExtractor: vi.fn(),
  mockTriggerDocumentSplitter: vi.fn(),
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
  shouldTriggerDocumentSplitter: mockShouldTriggerDocumentSplitter,
  shouldTriggerPageRotator: mockShouldTriggerPageRotator,
  shouldTriggerOcrProcessor: mockShouldTriggerOcrProcessor,
  shouldTriggerContentDedup: mockShouldTriggerContentDedup,
  shouldTriggerMetadataExtractor: mockShouldTriggerMetadataExtractor,
  triggerDocumentSplitter: mockTriggerDocumentSplitter,
  triggerPageRotator: mockTriggerPageRotator,
  triggerOcrProcessor: mockTriggerOcrProcessor,
  triggerContentDedup: mockTriggerContentDedup,
  triggerMetadataExtractor: mockTriggerMetadataExtractor,
  finalizePipelineReadinessIfDue: mockFinalizePipelineReadinessIfDue,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '@api/pipeline/ingester/callback/route'
import { DATA_INGESTER_CALLBACK_PATH } from '@constants/paths'

describe('ingester callback route', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'ingester-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('records callback receipt using a unix timestamp and triggers the next stage', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T05:17:16.000Z'))

    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-1',
      batchName: 'Batch 1',
      startedBy: 'archivist@example.org',
    })
    mockShouldTriggerDocumentSplitter.mockReturnValue(true)
    mockShouldTriggerPageRotator.mockReturnValue(false)
    mockShouldTriggerOcrProcessor.mockReturnValue(false)
    mockShouldTriggerContentDedup.mockReturnValue(false)
    mockShouldTriggerMetadataExtractor.mockReturnValue(false)
    mockTriggerDocumentSplitter.mockResolvedValue(undefined)

    const request = new NextRequest(`http://localhost${DATA_INGESTER_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ingester-token',
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
    expect(mockMarkProcessStageCallbackReceived).toHaveBeenCalledWith('batch-1', 'ingester', 1780031836)
    expect(mockTriggerDocumentSplitter).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('triggers metadata extractor when it is the next eligible stage', async () => {
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-2',
      batchName: 'Batch 2',
      startedBy: 'archivist@example.org',
    })
    mockShouldTriggerDocumentSplitter.mockReturnValue(false)
    mockShouldTriggerPageRotator.mockReturnValue(false)
    mockShouldTriggerOcrProcessor.mockReturnValue(false)
    mockShouldTriggerContentDedup.mockReturnValue(false)
    mockShouldTriggerMetadataExtractor.mockReturnValue(true)
    mockTriggerMetadataExtractor.mockResolvedValue(undefined)

    const request = new NextRequest(`http://localhost${DATA_INGESTER_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ingester-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: 'batch-2',
        request_id: 'request-2',
        status: 'completed',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(204)
    expect(mockTriggerMetadataExtractor).toHaveBeenCalledTimes(1)
    expect(mockTriggerDocumentSplitter).not.toHaveBeenCalled()
    expect(mockTriggerPageRotator).not.toHaveBeenCalled()
    expect(mockTriggerOcrProcessor).not.toHaveBeenCalled()
    expect(mockTriggerContentDedup).not.toHaveBeenCalled()
  })
})
