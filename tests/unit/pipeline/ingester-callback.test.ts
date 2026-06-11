import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetProcessBatchStatus,
  mockMarkProcessStageCallbackReceived,
  mockShouldTriggerDocumentSplitter,
  mockShouldTriggerPageRotator,
  mockShouldTriggerOcrProcessor,
  mockShouldTriggerContentDedup,
  mockTriggerDocumentSplitter,
  mockTriggerPageRotator,
  mockTriggerOcrProcessor,
  mockTriggerContentDedup,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockMarkProcessStageCallbackReceived: vi.fn(),
  mockShouldTriggerDocumentSplitter: vi.fn(),
  mockShouldTriggerPageRotator: vi.fn(),
  mockShouldTriggerOcrProcessor: vi.fn(),
  mockShouldTriggerContentDedup: vi.fn(),
  mockTriggerDocumentSplitter: vi.fn(),
  mockTriggerPageRotator: vi.fn(),
  mockTriggerOcrProcessor: vi.fn(),
  mockTriggerContentDedup: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
  markProcessStageCallbackReceived: mockMarkProcessStageCallbackReceived,
}))

vi.mock('@lib/pipelineTriggers', () => ({
  shouldTriggerDocumentSplitter: mockShouldTriggerDocumentSplitter,
  shouldTriggerPageRotator: mockShouldTriggerPageRotator,
  shouldTriggerOcrProcessor: mockShouldTriggerOcrProcessor,
  shouldTriggerContentDedup: mockShouldTriggerContentDedup,
  triggerDocumentSplitter: mockTriggerDocumentSplitter,
  triggerPageRotator: mockTriggerPageRotator,
  triggerOcrProcessor: mockTriggerOcrProcessor,
  triggerContentDedup: mockTriggerContentDedup,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '../../../app/api/pipeline/ingester/callback/route'

describe('ingester callback route', () => {
  beforeEach(() => {
    process.env.DATA_INGESTER_CALLBACK_TOKEN = 'ingester-token'
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
    mockTriggerDocumentSplitter.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/pipeline/ingester/callback', {
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
})
