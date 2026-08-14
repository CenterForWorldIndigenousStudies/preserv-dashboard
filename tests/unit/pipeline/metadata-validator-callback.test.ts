import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetProcessBatchStatus,
  mockRecordMetadataValidatorCompletion,
  mockMarkProcessStageCallbackReceived,
  mockShouldTriggerRightsDeterminator,
  mockTriggerRightsDeterminator,
  mockFinalizePipelineReadinessIfDue,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockRecordMetadataValidatorCompletion: vi.fn(),
  mockMarkProcessStageCallbackReceived: vi.fn(),
  mockShouldTriggerRightsDeterminator: vi.fn(),
  mockTriggerRightsDeterminator: vi.fn(),
  mockFinalizePipelineReadinessIfDue: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
  recordMetadataValidatorCompletion: mockRecordMetadataValidatorCompletion,
  markProcessStageCallbackReceived: mockMarkProcessStageCallbackReceived,
}))

vi.mock('@lib/pipelineTriggers', () => ({
  shouldTriggerRightsDeterminator: mockShouldTriggerRightsDeterminator,
  triggerRightsDeterminator: mockTriggerRightsDeterminator,
  finalizePipelineReadinessIfDue: mockFinalizePipelineReadinessIfDue,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '@api/pipeline/metadata-validator/callback/route'
import { METADATA_VALIDATOR_CALLBACK_PATH } from '@constants/paths'

describe('metadata-validator callback route', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'metadata-validator-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('records callback receipt and triggers rights determinator when it is next eligible', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T21:00:00.000Z'))
    mockRecordMetadataValidatorCompletion.mockResolvedValue(undefined)
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-1',
      batchName: 'Batch 1',
      startedBy: 'archivist@example.org',
    })
    mockShouldTriggerRightsDeterminator.mockReturnValue(true)
    mockTriggerRightsDeterminator.mockResolvedValue(undefined)

    const request = new NextRequest(`http://localhost${METADATA_VALIDATOR_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer metadata-validator-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: 'batch-1',
        request_id: 'request-1',
        status: 'completed',
        processed_count: 4,
        metadata_validated_count: 3,
        needs_review_count: 1,
        failed_count: 0,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(204)
    expect(mockRecordMetadataValidatorCompletion).toHaveBeenCalledWith('batch-1', {
      requestId: 'request-1',
      initiatedAt: '2026-07-02T21:00:00.000Z',
      completedAt: '2026-07-02T21:00:00.000Z',
      processedCount: 4,
      metadataValidatedCount: 3,
      needsReviewCount: 1,
      failedCount: 0,
    })
    expect(mockMarkProcessStageCallbackReceived).toHaveBeenCalledWith('batch-1', 'metadata_validator', 1783026000)
    expect(mockTriggerRightsDeterminator).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
