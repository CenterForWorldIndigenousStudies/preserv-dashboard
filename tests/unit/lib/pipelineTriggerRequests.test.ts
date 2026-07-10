import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockLogEvent } = vi.hoisted(() => ({
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import {
  triggerMetadataExtractor,
  triggerMetadataValidator,
  triggerRightsDeterminator,
} from '@lib/pipelineTriggerRequests'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatchStatus(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-07-03T01:33:45.041Z',
    pipelineRequestedStages: ['metadata-extraction'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    rightsDeterminator: null,
    ...overrides,
  }
}

function buildJsonResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('pipelineTriggerRequests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.PIPELINE_API_BASE_URL = 'http://localhost:8000'
    process.env.PIPELINE_TRIGGER_TOKEN = 'pipeline-trigger-token'
    process.env.PIPELINE_CALLBACK_TOKEN = 'pipeline-callback-token'
    process.env.DASHBOARD_BASE_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    delete process.env.PIPELINE_API_BASE_URL
    delete process.env.PIPELINE_TRIGGER_TOKEN
    delete process.env.PIPELINE_CALLBACK_TOKEN
    delete process.env.DASHBOARD_BASE_URL
  })

  it('sends the metadata extractor trigger with the shared callback contract', async () => {
    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(
        buildJsonResponse({
          batchId: 'batch-1',
          status: 'queued',
          service: 'metadata_extractor',
          pass: null,
        }),
      )
    })

    await triggerMetadataExtractor(buildBatchStatus())

    expect(fetch).toHaveBeenCalledTimes(1)
    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-extractor.')
    }

    const payload = JSON.parse(receivedBody) as Record<string, unknown>
    expect(payload.app).toBe('preserv-dashboard')
    expect(payload.batch_id).toBe('batch-1')
    expect(payload.request_id).toEqual(expect.any(String))
    expect(payload.started_by).toBe('archivist@example.org')
    expect(typeof payload.initiated_at).toBe('string')
    expect(payload.callback).toEqual({
      url: 'http://localhost:3000/api/pipeline/metadata-extractor/callback',
      token: 'pipeline-callback-token',
    })
  })

  it('sends the metadata validator trigger with the shared callback contract', async () => {
    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(
        buildJsonResponse({
          batchId: 'batch-1',
          status: 'queued',
          service: 'metadata_validator',
          pass: null,
        }),
      )
    })

    await triggerMetadataValidator(buildBatchStatus())

    expect(fetch).toHaveBeenCalledTimes(1)
    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-validator.')
    }

    const payload = JSON.parse(receivedBody) as Record<string, unknown>
    expect(payload.callback).toEqual({
      url: 'http://localhost:3000/api/pipeline/metadata-validator/callback',
      token: 'pipeline-callback-token',
    })
  })

  it('sends the rights determinator trigger with the shared callback contract', async () => {
    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(
        buildJsonResponse({
          batchId: 'batch-1',
          status: 'queued',
          service: 'rights_determinator',
          pass: null,
        }),
      )
    })

    await triggerRightsDeterminator(buildBatchStatus())

    expect(fetch).toHaveBeenCalledTimes(1)
    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to rights-determinator.')
    }

    const payload = JSON.parse(receivedBody) as Record<string, unknown>
    expect(payload.callback).toEqual({
      url: 'http://localhost:3000/api/pipeline/rights-determinator/callback',
      token: 'pipeline-callback-token',
    })
  })
})
