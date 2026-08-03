import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockRecordRightsDeterminatorCompletion,
  mockMarkProcessStageCallbackReceived,
  mockGetProcessBatchStatus,
  mockLogEvent,
} = vi.hoisted(() => ({
    mockRecordRightsDeterminatorCompletion: vi.fn(),
    mockMarkProcessStageCallbackReceived: vi.fn(),
    mockGetProcessBatchStatus: vi.fn(),
    mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  recordRightsDeterminatorCompletion: mockRecordRightsDeterminatorCompletion,
  markProcessStageCallbackReceived: mockMarkProcessStageCallbackReceived,
  getProcessBatchStatus: mockGetProcessBatchStatus,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '@api/pipeline/rights-determinator/callback/route'
import { RIGHTS_DETERMINATOR_CALLBACK_PATH } from '@constants/paths'

describe('rights-determinator callback route', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'rights-determinator-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('records rights determinator callback receipt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T21:00:00.000Z'))
    mockRecordRightsDeterminatorCompletion.mockResolvedValue(undefined)
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)
    mockGetProcessBatchStatus.mockResolvedValue(null)

    const request = new NextRequest(`http://localhost${RIGHTS_DETERMINATOR_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer rights-determinator-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: 'batch-1',
        request_id: 'request-1',
        status: 'completed',
        processed_count: 4,
        rights_determined_count: 2,
        under_review_count: 1,
        failed_count: 1,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(204)
    expect(mockRecordRightsDeterminatorCompletion).toHaveBeenCalledWith('batch-1', {
      requestId: 'request-1',
      initiatedAt: '2026-07-02T21:00:00.000Z',
      completedAt: '2026-07-02T21:00:00.000Z',
      processedCount: 4,
      rightsDeterminedCount: 2,
      underReviewCount: 1,
      failedCount: 1,
    })
    expect(mockMarkProcessStageCallbackReceived).toHaveBeenCalledWith('batch-1', 'rights_determinator', 1783026000)
    vi.useRealTimers()
  })
})
