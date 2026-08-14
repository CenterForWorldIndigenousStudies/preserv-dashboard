import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetDashboardSession,
  mockGetProcessBatchStatus,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockGetProcessBatchStatus: vi.fn(),
  mockLogEvent: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

import { POST as postOpenAIBatchStatus } from '@api/process/metadata-extractor/openai-batch-status/route'
import { POST as postRunWaveTwo } from '@api/process/metadata-extractor/run-wave-two/route'
import {
  METADATA_EXTRACTOR_OPENAI_BATCH_STATUS_PATH,
  METADATA_EXTRACTOR_RUN_WAVE_TWO_PATH,
} from '@constants/paths'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatchStatus(): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-07-29T12:00:00.000Z',
    pipelineRequestedStages: ['metadata-extraction'],
    pipelineConfig: {
      profileId: 'custom',
      mode: 'custom',
      metadataExtraction: { mode: 'openai_batch' },
      executionPlan: [],
    },
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: {
      status: 'in_progress',
      mode: 'openai_batch',
      requestId: 'request-1',
      requestedByApp: 'preserv-dashboard',
      initiatedAt: '2026-07-29T12:00:00.000Z',
      startedAt: '2026-07-29T12:00:00.000Z',
      completedAt: null,
      lastTransitionAt: '2026-07-29T12:00:00.000Z',
      error: null,
      callbackDeliveryStatus: null,
      callbackNotifiedAt: null,
      callbackReceivedAt: null,
      callbackHttpStatus: null,
      callbackErrorType: null,
      callbackErrorMessage: null,
      processedCount: 2,
      ingestedCount: 0,
      duplicateCount: 0,
      exactDuplicateCount: 0,
      skippedSameOriginCount: 0,
      splitCount: 0,
      childCount: 0,
      passedThroughCount: 0,
      rotatedCount: 0,
      normalizedCount: 0,
      ocrCompletedCount: 0,
      extractedCount: 0,
      metadataValidatedCount: 0,
      rightsDeterminedCount: 0,
      needsReviewCount: 0,
      versionedCount: 0,
      resolvedCount: 0,
      skippedCount: 0,
      reviewNeededCount: 0,
      failedCount: 0,
      currentPass: 1,
      maxPasses: 1,
      completedPasses: [],
      sourceFolderIds: [],
      collectionName: null,
      collectionNotes: null,
      openaiBatchWave1: {
        status: 'completed',
        openaiBatchId: 'provider-batch-1',
        submittedAt: '2026-07-29T12:01:00.000Z',
        checkedAt: '2026-07-29T12:05:00.000Z',
        completedAt: '2026-07-29T12:05:00.000Z',
        processedCount: 2,
        succeededCount: 2,
        failedCount: 0,
        failures: [],
      },
      openaiBatchWave2: {
        status: 'not_started',
        openaiBatchId: null,
        submittedAt: null,
        checkedAt: null,
        completedAt: null,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        failures: [],
      },
    },
    metadataValidator: null,
    rightsDeterminator: null,
  }
}

describe('metadata extractor OpenAI batch routes', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.PIPELINE_API_BASE_URL = 'http://localhost:8000'
    process.env.PIPELINE_TRIGGER_TOKEN = 'pipeline-trigger-token'
    process.env.PIPELINE_CALLBACK_TOKEN = 'pipeline-callback-token'
    process.env.DASHBOARD_BASE_URL = 'http://localhost:3000'
    mockGetDashboardSession.mockResolvedValue({
      user: {
        email: 'archivist@example.org',
      },
    })
    mockGetProcessBatchStatus.mockResolvedValue(buildBatchStatus())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    delete process.env.PIPELINE_API_BASE_URL
    delete process.env.PIPELINE_TRIGGER_TOKEN
    delete process.env.PIPELINE_CALLBACK_TOKEN
    delete process.env.DASHBOARD_BASE_URL
  })

  it('queues a wave one status check against pipeline-api', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ batchId: 'batch-1', status: 'queued', service: 'metadata_extractor', pass: null }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const request = new NextRequest(`http://localhost${METADATA_EXTRACTOR_OPENAI_BATCH_STATUS_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ batchId: 'batch-1' }),
    })

    const response = await postOpenAIBatchStatus(request)

    expect(response.status).toBe(202)
    expect(fetch).toHaveBeenCalledTimes(1)
    const requestUrl = vi.mocked(fetch).mock.calls[0]?.[0]
    expect(requestUrl instanceof URL ? requestUrl.toString() : requestUrl).toBe(
      'http://localhost:8000/metadata-extractor/openai-batch-status',
    )
  })

  it('rejects a wave one status check before wave one has been submitted', async () => {
    const batch = buildBatchStatus()
    mockGetProcessBatchStatus.mockResolvedValueOnce({
      ...batch,
      metadataExtractor: batch.metadataExtractor
        ? {
            ...batch.metadataExtractor,
            openaiBatchWave1: null,
          }
        : null,
    })

    const request = new NextRequest(`http://localhost${METADATA_EXTRACTOR_OPENAI_BATCH_STATUS_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ batchId: 'batch-1' }),
    })

    const response = await postOpenAIBatchStatus(request)
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Wave one must be submitted')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects wave two before wave one has finished importing', async () => {
    const batch = buildBatchStatus()
    mockGetProcessBatchStatus.mockResolvedValueOnce({
      ...batch,
      metadataExtractor: batch.metadataExtractor
        ? {
            ...batch.metadataExtractor,
            openaiBatchWave1: {
              status: 'submitted',
              openaiBatchId: 'provider-batch-1',
              submittedAt: '2026-07-29T12:01:00.000Z',
              checkedAt: null,
              completedAt: null,
              processedCount: 2,
              succeededCount: 0,
              failedCount: 0,
              failures: [],
            },
          }
        : null,
    })

    const request = new NextRequest(`http://localhost${METADATA_EXTRACTOR_RUN_WAVE_TWO_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ batchId: 'batch-1' }),
    })

    const response = await postRunWaveTwo(request)
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Wave one must be completed')
    expect(fetch).not.toHaveBeenCalled()
  })
})
