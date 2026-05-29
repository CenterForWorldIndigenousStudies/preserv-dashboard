import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetDashboardSession,
  mockLogEvent,
  mockSetProcessBatchPipelineConfig,
  mockSetProcessBatchRequestedStages,
} = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockLogEvent: vi.fn(),
  mockSetProcessBatchPipelineConfig: vi.fn(),
  mockSetProcessBatchRequestedStages: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

vi.mock('@lib/processBatches', () => ({
  setProcessBatchPipelineConfig: mockSetProcessBatchPipelineConfig,
  setProcessBatchRequestedStages: mockSetProcessBatchRequestedStages,
}))

import { POST } from '../../../app/api/process/start/route'

describe('process start route', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.DATA_INGESTER_BASE_URL = 'http://localhost:8000'
    process.env.DATA_INGESTER_TRIGGER_TOKEN = 'ingester-trigger-token'
    process.env.DATA_INGESTER_CALLBACK_TOKEN = 'ingester-callback-token'
    process.env.DASHBOARD_BASE_URL = 'http://localhost:3000'
    mockGetDashboardSession.mockResolvedValue({
      user: {
        email: 'dev-bypass@local.dev',
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    delete process.env.DATA_INGESTER_BASE_URL
    delete process.env.DATA_INGESTER_TRIGGER_TOKEN
    delete process.env.DATA_INGESTER_CALLBACK_TOKEN
    delete process.env.DASHBOARD_BASE_URL
  })

  it('returns and logs ingester duplicate-batch detail as error text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Batch Test already exists. Please try another.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const request = new NextRequest('http://localhost/api/process/start', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batchName: 'Test',
        sourceFolderIds: ['folder-1'],
        requestedStages: [],
      }),
    })

    const response = await POST(request)
    const payload = (await response.json()) as { error?: string; detail?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toBe('Batch Test already exists. Please try another.')
    expect(payload.detail).toBe('Batch Test already exists. Please try another.')
    expect(mockLogEvent).toHaveBeenCalledWith(
      'error',
      'ingester_trigger_failed',
      expect.objectContaining({
        statusCode: 400,
        errorMessage: 'Batch Test already exists. Please try another.',
      }),
    )
    expect(mockSetProcessBatchPipelineConfig).not.toHaveBeenCalled()
    expect(mockSetProcessBatchRequestedStages).not.toHaveBeenCalled()
  })
})
