import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetProcessBatchStatus,
  mockMarkProcessStageCallbackReceived,
  mockShouldTriggerMetadataExtractor,
  mockTriggerMetadataExtractor,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockMarkProcessStageCallbackReceived: vi.fn(),
  mockShouldTriggerMetadataExtractor: vi.fn(),
  mockTriggerMetadataExtractor: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
  markProcessStageCallbackReceived: mockMarkProcessStageCallbackReceived,
}))

vi.mock('@lib/pipelineTriggers', () => ({
  shouldTriggerMetadataExtractor: mockShouldTriggerMetadataExtractor,
  triggerMetadataExtractor: mockTriggerMetadataExtractor,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '../../../app/api/pipeline/content-dedup/callback/route'

describe('content-dedup callback route', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'content-dedup-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('triggers metadata extractor when it is the next eligible step', async () => {
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-1',
      batchName: 'Batch 1',
      startedBy: 'archivist@example.org',
    })
    mockShouldTriggerMetadataExtractor.mockReturnValue(true)
    mockTriggerMetadataExtractor.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/pipeline/content-dedup/callback', {
      method: 'POST',
      headers: {
        authorization: 'Bearer content-dedup-token',
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
    expect(mockMarkProcessStageCallbackReceived).toHaveBeenCalledWith('batch-1', 'content_dedup', expect.any(Number))
    expect(mockTriggerMetadataExtractor).toHaveBeenCalledTimes(1)
  })
})
