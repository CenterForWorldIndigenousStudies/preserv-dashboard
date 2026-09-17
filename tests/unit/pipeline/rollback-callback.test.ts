import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetProcessBatchStatus, mockLogEvent } = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '@api/pipeline/rollback/callback/route'

describe('rollback callback route', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'callback-token'
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-1',
      lifecycleStatus: 'rolled_back',
      rollbackStatus: 'rolled_back',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.PIPELINE_CALLBACK_TOKEN
  })

  it('accepts a terminal rolled-back callback after the shared database state is updated', async () => {
    const request = new NextRequest('http://localhost/api/pipeline/rollback/callback', {
      method: 'POST',
      headers: {
        authorization: 'Bearer callback-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: 'batch-1',
        rollback_id: 'rollback-1',
        status: 'rolled_back',
        completed_at: '2026-09-17T17:35:49.000Z',
        restored_count: 5,
        deleted_count: 7,
        cancelled_count: 0,
        conflict_count: 0,
        failed_count: 0,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(204)
    expect(mockGetProcessBatchStatus).toHaveBeenCalledWith('batch-1')
    expect(mockLogEvent).toHaveBeenCalledWith(
      'info',
      'batch_rollback_callback_received',
      expect.objectContaining({ batchId: 'batch-1', rollbackId: 'rollback-1', status: 'rolled_back' }),
    )
  })
})
