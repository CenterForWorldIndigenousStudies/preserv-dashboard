import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetProcessBatchStatus, mockRecordProcessStageFailure, mockLogEvent } = vi.hoisted(() => ({
  mockGetProcessBatchStatus: vi.fn(),
  mockRecordProcessStageFailure: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
  recordProcessStageFailure: mockRecordProcessStageFailure,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { handlePipelineCallback } from '@lib/pipelineCallbackHandling'

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/pipeline/callback', {
    method: 'POST',
    headers: {
      authorization: 'Bearer callback-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('pipeline callback handling', () => {
  beforeEach(() => {
    process.env.PIPELINE_CALLBACK_TOKEN = 'callback-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.PIPELINE_CALLBACK_TOKEN
  })

  it('ignores callbacks from an older operation', async () => {
    mockGetProcessBatchStatus.mockResolvedValue({
      metadataValidator: { operationId: 'operation-current' },
    })
    const onSuccess = vi.fn()

    const response = await handlePipelineCallback({
      request: buildRequest({
        batch_id: 'batch-1',
        request_id: 'request-old',
        operation_id: 'operation-old',
        status: 'completed',
      }),
      stage: 'metadata_validator',
      eventName: 'metadata_validator_callback',
      onSuccess,
    })

    expect(response.status).toBe(204)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(mockRecordProcessStageFailure).not.toHaveBeenCalled()
  })

  it('records a failed callback without invoking downstream success work', async () => {
    mockGetProcessBatchStatus.mockResolvedValue({
      batchId: 'batch-1',
      metadataValidator: { operationId: 'operation-1' },
    })
    mockRecordProcessStageFailure.mockResolvedValue(undefined)
    const onSuccess = vi.fn()

    const response = await handlePipelineCallback({
      request: buildRequest({
        batch_id: 'batch-1',
        request_id: 'request-1',
        operation_id: 'operation-1',
        execution_mode: 'retry',
        status: 'failed',
        error: 'Metadata validation failed',
      }),
      stage: 'metadata_validator',
      eventName: 'metadata_validator_callback',
      onSuccess,
    })

    expect(response.status).toBe(204)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(mockRecordProcessStageFailure).toHaveBeenCalledTimes(1)
    const failureCall = mockRecordProcessStageFailure.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ]
    expect(failureCall[0]).toBe('batch-1')
    expect(failureCall[1]).toBe('metadata_validator')
    expect(failureCall[2]).toMatchObject({
      requestId: 'request-1',
      operationId: 'operation-1',
      executionMode: 'retry',
      errorType: 'PipelineStageFailure',
      errorMessage: 'Metadata validation failed',
    })
    expect(typeof failureCall[2].receivedAt).toBe('number')
  })
})
