import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockMarkProcessStageCallbackReceived,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockMarkProcessStageCallbackReceived: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/processBatches', () => ({
  markProcessStageCallbackReceived: mockMarkProcessStageCallbackReceived,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST } from '../../../app/api/pipeline/metadata-extractor/callback/route'

describe('metadata-extractor callback route', () => {
  beforeEach(() => {
    process.env.METADATA_EXTRACTOR_CALLBACK_TOKEN = 'metadata-extractor-token'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('records metadata extractor callback receipt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T21:00:00.000Z'))
    mockMarkProcessStageCallbackReceived.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/pipeline/metadata-extractor/callback', {
      method: 'POST',
      headers: {
        authorization: 'Bearer metadata-extractor-token',
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
    expect(mockMarkProcessStageCallbackReceived).toHaveBeenCalledWith('batch-1', 'metadata_extractor', 1783026000)
    vi.useRealTimers()
  })
})
