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

import { POST } from '@api/pipeline/page-rotator/callback/route'
import { PAGE_ROTATOR_CALLBACK_PATH } from '@constants/paths'

describe('page-rotator callback route', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'page-rotator-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('triggers document splitter when split pass 2 is next', async () => {
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

    const request = new NextRequest(`http://localhost${PAGE_ROTATOR_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer page-rotator-token',
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
    expect(mockTriggerDocumentSplitter).toHaveBeenCalledTimes(1)
    expect(mockTriggerPageRotator).not.toHaveBeenCalled()
    expect(mockTriggerOcrProcessor).not.toHaveBeenCalled()
    expect(mockTriggerContentDedup).not.toHaveBeenCalled()
  })

  it('triggers page rotator again when rotate pass 2 is next', async () => {
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-2',
      batchName: 'Batch 2',
      startedBy: 'archivist@example.org',
    })
    mockShouldTriggerDocumentSplitter.mockReturnValue(false)
    mockShouldTriggerPageRotator.mockReturnValue(true)
    mockShouldTriggerOcrProcessor.mockReturnValue(false)
    mockShouldTriggerContentDedup.mockReturnValue(false)
    mockShouldTriggerMetadataExtractor.mockReturnValue(false)
    mockTriggerPageRotator.mockResolvedValue(undefined)

    const request = new NextRequest(`http://localhost${PAGE_ROTATOR_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer page-rotator-token',
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
    expect(mockTriggerPageRotator).toHaveBeenCalledTimes(1)
    expect(mockTriggerDocumentSplitter).not.toHaveBeenCalled()
    expect(mockTriggerOcrProcessor).not.toHaveBeenCalled()
    expect(mockTriggerContentDedup).not.toHaveBeenCalled()
  })

  it('triggers metadata extractor when it is the next eligible stage', async () => {
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-3',
      batchName: 'Batch 3',
      startedBy: 'archivist@example.org',
    })
    mockShouldTriggerDocumentSplitter.mockReturnValue(false)
    mockShouldTriggerPageRotator.mockReturnValue(false)
    mockShouldTriggerOcrProcessor.mockReturnValue(false)
    mockShouldTriggerContentDedup.mockReturnValue(false)
    mockShouldTriggerMetadataExtractor.mockReturnValue(true)
    mockTriggerMetadataExtractor.mockResolvedValue(undefined)

    const request = new NextRequest(`http://localhost${PAGE_ROTATOR_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer page-rotator-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: 'batch-3',
        request_id: 'request-3',
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
