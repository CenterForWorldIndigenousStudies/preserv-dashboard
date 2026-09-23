import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockLogEvent } = vi.hoisted(() => ({
  mockLogEvent: vi.fn(),
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import {
  triggerDataIngesterBatch,
  triggerDataIngesterReprocess,
  triggerMetadataExtractor,
} from '@lib/pipelineTriggerRequests'
import type { ProcessBatchStatus } from 'types/pipelineContracts'
import { DATA_INGESTER_REPROCESS_CALLBACK_PATH, METADATA_EXTRACTOR_CALLBACK_PATH } from '@constants/paths'
import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'

function buildBatchStatus(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-07-03T01:33:45.041Z',
          pipelineRequestedStages: ['metadata_extractor'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
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
    expect(payload).not.toHaveProperty('batch_name')
    expect(payload.request_id).toEqual(expect.any(String))
    expect(payload.started_by).toBe('archivist@example.org')
    expect(typeof payload.initiated_at).toBe('string')
    expect(payload.callback).toEqual({
      url: `http://localhost:3000${METADATA_EXTRACTOR_CALLBACK_PATH}`,
      token: 'pipeline-callback-token',
    })
  })

  it('sends targeted reprocessing to Data Ingester with the shared callback token', async () => {
    let receivedBody: string | null = null
    let receivedUrl: string | null = null
    let receivedAuthorization: string | null = null
    vi.mocked(fetch).mockImplementation((input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      receivedUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      receivedAuthorization = new Headers(init?.headers).get('Authorization')
      return Promise.resolve(buildJsonResponse({ batchId: 'batch-1', status: 'queued', service: 'data_ingester' }))
    })

    await triggerDataIngesterReprocess(buildBatchStatus(), {
      executionMode: GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS,
      operationId: 'operation-reprocess-1',
      idempotencyKey: 'operation-reprocess-1',
      draftBatchId: 'draft-1',
      sourceDocumentIds: ['document-1'],
      requestedStages: ['document_splitter'],
      reason: 'Retry this document',
    })

    expect(receivedUrl).toBe('http://localhost:8000/reprocess')
    expect(receivedAuthorization).toBe('Bearer pipeline-trigger-token')
    expect(JSON.parse(receivedBody ?? '')).toMatchObject({
      execution_mode: 'reprocess',
      batch_id: 'batch-1',
      draft_batch_id: 'draft-1',
      source_document_ids: ['document-1'],
      requested_stages: ['document_splitter'],
      callback: {
        url: `http://localhost:3000${DATA_INGESTER_REPROCESS_CALLBACK_PATH}`,
        token: 'pipeline-callback-token',
      },
    })
    expect(JSON.parse(receivedBody ?? '')).not.toHaveProperty('source_folder_ids')
  })

  it('includes the batch name when submitting a normal Data Ingester draft', async () => {
    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(buildJsonResponse({ batchId: 'batch-1', status: 'queued', service: 'data_ingester' }))
    })

    await triggerDataIngesterBatch(buildBatchStatus(), {
      pipelineConfig: {
        profileId: 'custom',
        mode: 'custom',
        metadataExtraction: { mode: 'direct' },
        executionPlan: [],
        sourceFolderIds: ['folder-1'],
        sourceDocumentIds: [],
      },
      requestedStages: ['document_splitter'],
    })

    expect(JSON.parse(receivedBody ?? '')).toMatchObject({
      batch_id: 'batch-1',
      batch_name: 'Batch 1',
    })
  })

  it('reports structured pipeline validation details when a trigger is rejected', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [
            {
              loc: ['body', 'source_folder_ids'],
              msg: 'a draft batch must contain at least one source folder or document',
              type: 'value_error',
            },
          ],
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(
      triggerDataIngesterBatch(buildBatchStatus(), {
        pipelineConfig: {
          profileId: 'custom',
          mode: 'custom',
          metadataExtraction: { mode: 'direct' },
          executionPlan: [],
          sourceFolderIds: ['folder-1'],
          sourceDocumentIds: [],
        },
        requestedStages: ['document_splitter'],
      }),
    ).rejects.toThrow('source_folder_ids: a draft batch must contain at least one source folder or document')

    expect(mockLogEvent).toHaveBeenCalledWith(
      'error',
      'data_ingester_trigger_failed',
      expect.objectContaining({
        statusCode: 422,
        responseDetails: [
          {
            loc: ['body', 'source_folder_ids'],
            msg: 'a draft batch must contain at least one source folder or document',
            type: 'value_error',
          },
        ],
      }),
    )
  })

  it('serializes an explicit retry execution context', async () => {
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

    await triggerMetadataExtractor(buildBatchStatus(), {
      executionMode: GENERATED_PIPELINE_EXECUTION_MODES.RETRY,
      operationId: 'operation-1',
      idempotencyKey: 'idempotency-1',
      reason: 'Retry failed metadata validation',
    })

    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-extractor.')
    }

    expect(JSON.parse(receivedBody)).toMatchObject({
      execution_mode: 'retry',
      operation_id: 'operation-1',
      idempotency_key: 'idempotency-1',
      reason: 'Retry failed metadata validation',
      source_document_ids: [],
      source_batch_id: null,
      new_batch_name: null,
      draft_batch_id: null,
    })
  })

  it('serializes an existing draft batch reprocessing context', async () => {
    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(
        buildJsonResponse({ batchId: 'batch-1', status: 'queued', service: 'metadata_extractor', pass: null }),
      )
    })

    await triggerMetadataExtractor(buildBatchStatus(), {
      executionMode: GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS,
      operationId: 'operation-1',
      idempotencyKey: 'idempotency-1',
      draftBatchId: 'draft-1',
      reason: 'Retry selected documents',
    })

    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-extractor.')
    }

    expect(JSON.parse(receivedBody)).toMatchObject({
      batch_id: 'batch-1',
      execution_mode: 'reprocess',
      draft_batch_id: 'draft-1',
      new_batch_name: null,
    })
  })

  it('serializes an existing reprocessing batch continuation without a new batch name', async () => {
    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(buildJsonResponse({ batchId: 'batch-1', status: 'queued', service: 'metadata_extractor' }))
    })

    await triggerMetadataExtractor(buildBatchStatus(), {
      executionMode: GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS,
      operationId: 'operation-2',
      idempotencyKey: 'idempotency-2',
      reason: 'Continue selected reprocessing stages',
      sourceDocumentIds: ['document-1'],
    })

    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-extractor.')
    }

    expect(JSON.parse(receivedBody)).toMatchObject({
      batch_id: 'batch-1',
      execution_mode: 'reprocess',
      source_document_ids: ['document-1'],
      new_batch_name: null,
      draft_batch_id: null,
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
          service: 'metadata_extractor',
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
    await triggerMetadataExtractor(buildBatchStatus(), {
      executionMode: GENERATED_PIPELINE_EXECUTION_MODES.RERUN,
      operationId: 'operation-rerun-1',
      idempotencyKey: 'idempotency-rerun-1',
      reason: 'Run the selected configuration again',
      pipelineConfig,
    })

    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-extractor.')
    }

    expect(JSON.parse(receivedBody)).toMatchObject({
      execution_mode: 'rerun',
      pipeline_config: pipelineConfig,
    })
  })
})
