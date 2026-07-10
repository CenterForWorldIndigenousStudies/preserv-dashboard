import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetDashboardSession,
  mockLogEvent,
  mockSetProcessBatchPipelineConfig,
} = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockLogEvent: vi.fn(),
  mockSetProcessBatchPipelineConfig: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

vi.mock('@lib/processBatches', () => ({
  setProcessBatchPipelineConfig: mockSetProcessBatchPipelineConfig,
}))

import { POST } from '../../../app/api/process/start/route'

describe('process start route', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.PIPELINE_API_BASE_URL = 'http://localhost:8000'
    process.env.PIPELINE_TRIGGER_TOKEN = 'pipeline-trigger-token'
    process.env.PIPELINE_CALLBACK_TOKEN = 'pipeline-callback-token'
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
    delete process.env.PIPELINE_API_BASE_URL
    delete process.env.PIPELINE_TRIGGER_TOKEN
    delete process.env.PIPELINE_CALLBACK_TOKEN
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
        pipelineConfig: {
          profileId: 'custom',
          mode: 'custom',
          executionPlan: [
            {
              id: 'step-ingester',
              stepId: 'ingester',
              service: 'ingester',
              label: 'Ingest',
              order: 0,
              enabled: true,
            },
          ],
        },
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
  })

  it('rejects process starts that omit pipeline config', async () => {
    const request = new NextRequest('http://localhost/api/process/start', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batchName: 'Test',
        sourceFolderIds: ['folder-1'],
      }),
    })

    const response = await POST(request)
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toBe('pipelineConfig is required.')
    expect(fetch).not.toHaveBeenCalled()
    expect(mockSetProcessBatchPipelineConfig).not.toHaveBeenCalled()
  })

  it('sends pipeline config to pipeline-api ingest and persists it after acceptance', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ batchId: 'batch-1', status: 'queued', service: 'data_ingester', pass: null }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const pipelineConfig = {
      profileId: 'custom',
      mode: 'custom',
      executionPlan: [
        {
          id: 'step-ingester',
          stepId: 'ingester',
          service: 'ingester',
          label: 'Ingest',
          order: 0,
          enabled: true,
        },
        {
          id: 'step-normalize-pass-1-split',
          stepId: 'normalize-pass-1',
          service: 'document-splitter',
          label: 'Split Pass 1',
          order: 1,
          enabled: true,
          pass: 1,
        },
      ],
    }

    const request = new NextRequest('http://localhost/api/process/start', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batchName: 'Test',
        sourceFolderIds: ['folder-1'],
        pipelineConfig,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(202)
    expect(fetch).toHaveBeenCalledTimes(1)
    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const requestInit = fetchCall?.[1]
    expect(typeof requestInit?.body).toBe('string')
    if (typeof requestInit?.body !== 'string') {
      throw new Error('Expected dashboard to send a JSON string body to pipeline-api.')
    }
    const ingesterPayload = JSON.parse(requestInit.body) as { pipeline_config?: unknown }
    expect(ingesterPayload.pipeline_config).toEqual(pipelineConfig)
    expect(mockSetProcessBatchPipelineConfig).toHaveBeenCalledWith('batch-1', pipelineConfig)
  })
})
