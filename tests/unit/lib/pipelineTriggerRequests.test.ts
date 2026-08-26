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
import {
  METADATA_EXTRACTOR_CALLBACK_PATH,
  METADATA_VALIDATOR_CALLBACK_PATH,
  RIGHTS_DETERMINATOR_CALLBACK_PATH,
} from '@constants/paths'
import { PIPELINE_EXECUTION_MODES } from '@constants/pipelineExecutionModes'

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
      url: `http://localhost:3000${METADATA_EXTRACTOR_CALLBACK_PATH}`,
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
      url: `http://localhost:3000${METADATA_VALIDATOR_CALLBACK_PATH}`,
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
      url: `http://localhost:3000${RIGHTS_DETERMINATOR_CALLBACK_PATH}`,
      token: 'pipeline-callback-token',
    })
  })

  it('serializes an explicit retry execution context', async () => {
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

    await triggerMetadataValidator(buildBatchStatus(), {
      executionMode: PIPELINE_EXECUTION_MODES.RETRY,
      operationId: 'operation-1',
      idempotencyKey: 'idempotency-1',
      reason: 'Retry failed metadata validation',
    })

    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-validator.')
    }

    expect(JSON.parse(receivedBody)).toMatchObject({
      execution_mode: 'retry',
      operation_id: 'operation-1',
      idempotency_key: 'idempotency-1',
      reason: 'Retry failed metadata validation',
      source_document_ids: [],
      source_batch_id: null,
      new_batch_name: null,
    })
  })

  it('serializes the selected rerun pipeline configuration', async () => {
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

    const pipelineConfig = {
      profileId: 'custom' as const,
      mode: 'custom' as const,
      metadataExtraction: { mode: 'openai_batch' as const },
      executionPlan: [],
    }
    await triggerMetadataValidator(buildBatchStatus(), {
      executionMode: PIPELINE_EXECUTION_MODES.RERUN,
      operationId: 'operation-rerun-1',
      idempotencyKey: 'idempotency-rerun-1',
      reason: 'Run the selected configuration again',
      pipelineConfig,
    })

    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-validator.')
    }

    expect(JSON.parse(receivedBody)).toMatchObject({
      execution_mode: 'rerun',
      pipeline_config: pipelineConfig,
    })
  })
})
