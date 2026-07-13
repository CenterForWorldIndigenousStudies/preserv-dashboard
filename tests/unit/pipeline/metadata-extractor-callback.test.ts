import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetProcessBatchStatus,
  mockRecordMetadataExtractorCompletion,
  mockMarkProcessStageCallbackReceived,
  mockShouldTriggerMetadataValidator,
  mockTriggerMetadataValidator,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockRecordMetadataExtractorCompletion: vi.fn(),
  mockMarkProcessStageCallbackReceived: vi.fn(),
  mockShouldTriggerMetadataValidator: vi.fn(),
  mockTriggerMetadataValidator: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
  recordMetadataExtractorCompletion: mockRecordMetadataExtractorCompletion,
  markProcessStageCallbackReceived: mockMarkProcessStageCallbackReceived,
}))

vi.mock('@lib/pipelineTriggers', () => ({
  shouldTriggerMetadataValidator: mockShouldTriggerMetadataValidator,
  triggerMetadataValidator: mockTriggerMetadataValidator,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '@api/pipeline/metadata-extractor/callback/route'
import { METADATA_EXTRACTOR_CALLBACK_PATH } from '@constants/paths'

describe('metadata-extractor callback route', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'metadata-extractor-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('records callback receipt and triggers metadata validator when it is next eligible', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T21:00:00.000Z'))
    mockRecordMetadataExtractorCompletion.mockResolvedValue(undefined)
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-1',
      batchName: 'Batch 1',
      startedBy: 'archivist@example.org',
    })
    mockShouldTriggerMetadataValidator.mockReturnValue(true)
    mockTriggerMetadataValidator.mockResolvedValue(undefined)

    const request = new NextRequest(`http://localhost${METADATA_EXTRACTOR_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer metadata-extractor-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: 'batch-1',
        request_id: 'request-1',
        status: 'completed',
        processed_count: 4,
        extracted_count: 3,
        failed_count: 1,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(204)
    expect(mockRecordMetadataExtractorCompletion).toHaveBeenCalledWith('batch-1', {
      requestId: 'request-1',
      initiatedAt: '2026-07-02T21:00:00.000Z',
      completedAt: '2026-07-02T21:00:00.000Z',
      processedCount: 4,
      extractedCount: 3,
      failedCount: 1,
    })
    expect(mockMarkProcessStageCallbackReceived).toHaveBeenCalledWith('batch-1', 'metadata_extractor', 1783026000)
    expect(mockTriggerMetadataValidator).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
