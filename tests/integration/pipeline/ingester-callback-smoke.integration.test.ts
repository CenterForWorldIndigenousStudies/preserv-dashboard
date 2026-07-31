import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { db } from '@lib/db'

vi.mock('@root/auth', () => ({
  auth: () => Promise.resolve({ user: { email: 'test@example.com' } }),
  getDashboardSession: () => Promise.resolve({ user: { email: 'test@example.com' } }),
}))

import { POST as processStartRoute } from '@api/process/start/route'
import { POST as ingesterCallbackRoute } from '@api/pipeline/ingester/callback/route'
import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'
import { DATA_INGESTER_CALLBACK_PATH, DOCUMENT_SPLITTER_CALLBACK_PATH, PROCESS_START_PATH } from '@constants/paths'

function toRequestUrl(value: unknown): string {
  if (value instanceof URL) {
    return value.toString()
  }

  if (typeof value === 'string') {
    return value
  }

  throw new Error('Expected fetch to be called with a URL or string target.')
}

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('ingester callback smoke (integration)', () => {
  const batchId = 'batch-smoke-ingester-callback-0001'
  const pipelineConfig = {
    profileId: 'custom',
    mode: 'custom' as const,
    metadataExtraction: {
      mode: 'direct' as const,
    },
    executionPlan: [
      {
        id: 'step-ingester',
        stepId: 'ingester' as const,
        service: 'ingester' as const,
        label: 'Ingest',
        order: 0,
        enabled: true,
      },
      {
        id: 'step-normalize-pass-1-split',
        stepId: 'normalize-pass-1' as const,
        service: 'document-splitter' as const,
        label: 'Split Pass 1',
        order: 1,
        enabled: true,
        pass: 1 as const,
      },
    ],
  }

  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
  })

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T12:34:56.000Z'))

    process.env.DASHBOARD_BASE_URL = 'http://localhost:3000'
    process.env.PIPELINE_API_BASE_URL = 'http://pipeline.example.test:8000'
    process.env.PIPELINE_TRIGGER_TOKEN = 'pipeline-trigger-token'
    process.env.PIPELINE_CALLBACK_TOKEN = 'pipeline-callback-token'

    await db.batches.create({
      data: {
        id: batchId,
        id_legacy: 'batch-smoke-ingester-callback-legacy-0001',
        name: 'Smoke Test Batch',
        started_by: 'test@example.com',
        processing_details: JSON.stringify({
          data_ingester: {
            status: 'completed',
            request_id: 'ingester-request-1',
            requested_by_app: 'preserv-dashboard',
            initiated_at: '2026-07-03T12:30:00.000Z',
            started_at: '2026-07-03T12:30:00.000Z',
            completed_at: '2026-07-03T12:34:00.000Z',
            last_transition_at: '2026-07-03T12:34:00.000Z',
          },
        }),
      },
    })
  })

  afterEach(async () => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()

    delete process.env.DASHBOARD_BASE_URL
    delete process.env.PIPELINE_API_BASE_URL
    delete process.env.PIPELINE_TRIGGER_TOKEN
    delete process.env.PIPELINE_CALLBACK_TOKEN

    await db.batches.deleteMany({
      where: {
        id: batchId,
      },
    })
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('persists the pipeline config and triggers document-splitter after the ingester callback', async () => {
    const callbackReceivedAtUnix = Math.floor(new Date('2026-07-03T12:34:56.000Z').getTime() / 1000)

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ batchId, status: 'queued', service: 'data_ingester', pass: null }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accepted: true }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    const startRequest = new NextRequest(`http://localhost${PROCESS_START_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batchName: 'Smoke Test Batch',
        sourceFolderIds: ['folder-1'],
        pipelineConfig,
      }),
    })

    const startResponse = await processStartRoute(startRequest)

    expect(startResponse.status).toBe(202)

    const callbackRequest = new NextRequest(`http://localhost${DATA_INGESTER_CALLBACK_PATH}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer pipeline-callback-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch_id: batchId,
        request_id: 'ingester-request-1',
        status: 'completed',
      }),
    })

    const callbackResponse = await ingesterCallbackRoute(callbackRequest)

    expect(callbackResponse.status).toBe(204)
    expect(fetch).toHaveBeenCalledTimes(2)

    const ingesterCall = vi.mocked(fetch).mock.calls[0]
    expect(toRequestUrl(ingesterCall?.[0])).toBe('http://pipeline.example.test:8000/ingest')
    expect(ingesterCall?.[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer pipeline-trigger-token',
    })

    const splitterCall = vi.mocked(fetch).mock.calls[1]
    expect(toRequestUrl(splitterCall?.[0])).toBe('http://pipeline.example.test:8000/split')
    expect(splitterCall?.[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer pipeline-trigger-token',
    })

    const splitterBodyRaw = splitterCall?.[1]?.body
    expect(typeof splitterBodyRaw).toBe('string')
    if (typeof splitterBodyRaw !== 'string') {
      throw new Error('Expected document-splitter trigger body to be a JSON string.')
    }

    const splitterBody = JSON.parse(splitterBodyRaw) as {
      app: string
      batch_id: string
      started_by: string
      callback?: { url?: string; token?: string }
    }
    expect(splitterBody.app).toBe('preserv-dashboard')
    expect(splitterBody.batch_id).toBe(batchId)
    expect(splitterBody.started_by).toBe('test@example.com')
    expect(splitterBody.callback).toEqual({
      url: `http://localhost:3000${DOCUMENT_SPLITTER_CALLBACK_PATH}`,
      token: 'pipeline-callback-token',
    })

    const storedBatch = await db.batches.findUniqueOrThrow({
      where: { id: batchId },
      select: {
        processing_details: true,
      },
    })
    const processingDetails = JSON.parse(storedBatch.processing_details) as {
      pipeline?: { requested_stages?: string[]; config?: unknown }
      data_ingester?: { callback?: { received_at?: unknown } }
    }

    expect(processingDetails.pipeline?.requested_stages).toEqual(['document-splitter'])
    expect(processingDetails.pipeline?.config).toEqual(pipelineConfig)
    expect(processingDetails.data_ingester?.callback?.received_at).toBe(callbackReceivedAtUnix)
  })
})
