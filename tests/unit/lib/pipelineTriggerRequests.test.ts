import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockLogEvent } = vi.hoisted(() => ({
  mockLogEvent: vi.fn(),
}))

const { mockRecordMetadataExtractorCompletion } = vi.hoisted(() => ({
  mockRecordMetadataExtractorCompletion: vi.fn(),
}))

const { mockRecordMetadataValidatorCompletion } = vi.hoisted(() => ({
  mockRecordMetadataValidatorCompletion: vi.fn(),
}))

const { mockRecordRightsDeterminatorCompletion } = vi.hoisted(() => ({
  mockRecordRightsDeterminatorCompletion: vi.fn(),
}))

vi.mock('@lib/observability', () => ({
  logEvent: mockLogEvent,
}))

vi.mock('@lib/processBatches', () => ({
  recordMetadataExtractorCompletion: mockRecordMetadataExtractorCompletion,
  recordMetadataValidatorCompletion: mockRecordMetadataValidatorCompletion,
  recordRightsDeterminatorCompletion: mockRecordRightsDeterminatorCompletion,
}))

import { triggerMetadataExtractor, triggerMetadataValidator, triggerRightsDeterminator } from '@lib/pipelineTriggerRequests'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface MetadataExtractorCompletionArgs {
  requestId: string
  initiatedAt: string
  completedAt: string
  processedCount: number
  extractedCount: number
  failedCount: number
}

interface MetadataValidatorCompletionArgs {
  requestId: string
  initiatedAt: string
  completedAt: string
  processedCount: number
  metadataValidatedCount: number
  underReviewCount: number
  failedCount: number
}

interface RightsDeterminatorCompletionArgs {
  requestId: string
  initiatedAt: string
  completedAt: string
  processedCount: number
  rightsDeterminedCount: number
  underReviewCount: number
  failedCount: number
}

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
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getExtractorCompletionArgs(): MetadataExtractorCompletionArgs {
  const completionArgs = mockRecordMetadataExtractorCompletion.mock.calls[0]?.[1] as unknown
  return completionArgs as MetadataExtractorCompletionArgs
}

function getValidatorCompletionArgs(): MetadataValidatorCompletionArgs {
  const completionArgs = mockRecordMetadataValidatorCompletion.mock.calls[0]?.[1] as unknown
  return completionArgs as MetadataValidatorCompletionArgs
}

function getRightsDeterminatorCompletionArgs(): RightsDeterminatorCompletionArgs {
  const completionArgs = mockRecordRightsDeterminatorCompletion.mock.calls[0]?.[1] as unknown
  return completionArgs as RightsDeterminatorCompletionArgs
}

describe('pipelineTriggerRequests metadata extractor', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.METADATA_EXTRACTOR_BASE_URL = 'http://localhost:8005'
    process.env.METADATA_EXTRACTOR_TRIGGER_TOKEN = 'extractor-trigger-token'
    delete process.env.METADATA_EXTRACTOR_CALLBACK_TOKEN
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    delete process.env.METADATA_EXTRACTOR_BASE_URL
    delete process.env.METADATA_EXTRACTOR_TRIGGER_TOKEN
    delete process.env.METADATA_EXTRACTOR_CALLBACK_TOKEN
    delete process.env.MD_VALIDATE_BASE_URL
    delete process.env.MD_VALIDATE_TRIGGER_TOKEN
    delete process.env.MD_VALIDATE_CALLBACK_TOKEN
    delete process.env.RIGHTS_DETERMINATOR_BASE_URL
    delete process.env.RIGHTS_DETERMINE_TRIGGER_TOKEN
  })

  it('sends the extractor trigger contract without callback fields', async () => {
    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(buildJsonResponse({
        app: 'preserv-dashboard',
        batch_id: 'batch-1',
        processed_count: 0,
        extracted_count: 0,
        failed_count: 0,
        failures: [],
      }))
    })

    await triggerMetadataExtractor(buildBatchStatus())

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(receivedBody).not.toBeNull()
    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-extractor.')
    }

    const payload = JSON.parse(receivedBody) as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['app', 'batch_id', 'initiated_at'])
    expect(payload.app).toBe('preserv-dashboard')
    expect(payload.batch_id).toBe('batch-1')
    expect(typeof payload.initiated_at).toBe('string')
    expect(mockRecordMetadataExtractorCompletion.mock.calls[0]?.[0]).toBe('batch-1')
    expect(getExtractorCompletionArgs()).toMatchObject({
      processedCount: 0,
      extractedCount: 0,
      failedCount: 0,
    })
    expect(typeof getExtractorCompletionArgs().requestId).toBe('string')
    expect(typeof getExtractorCompletionArgs().initiatedAt).toBe('string')
    expect(typeof getExtractorCompletionArgs().completedAt).toBe('string')
  })

  it('sends the validator trigger contract without callback fields', async () => {
    process.env.MD_VALIDATE_BASE_URL = 'http://localhost:8006'
    process.env.MD_VALIDATE_TRIGGER_TOKEN = 'validator-trigger-token'

    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(buildJsonResponse({
        app: 'preserv-dashboard',
        batch_id: 'batch-1',
        processed_count: 4,
        metadata_validated_count: 3,
        under_review_count: 1,
        failed_count: 0,
        failures: [],
      }))
    })

    await triggerMetadataValidator(
      buildBatchStatus({
        pipelineRequestedStages: ['metadata-extraction', 'metadata-validation'],
      }),
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(receivedBody).not.toBeNull()
    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to metadata-validator.')
    }

    const payload = JSON.parse(receivedBody) as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['app', 'batch_id', 'initiated_at'])
    expect(payload.app).toBe('preserv-dashboard')
    expect(payload.batch_id).toBe('batch-1')
    expect(typeof payload.initiated_at).toBe('string')
    expect(mockRecordMetadataValidatorCompletion.mock.calls[0]?.[0]).toBe('batch-1')
    expect(getValidatorCompletionArgs()).toMatchObject({
      processedCount: 4,
      metadataValidatedCount: 3,
      underReviewCount: 1,
      failedCount: 0,
    })
    expect(typeof getValidatorCompletionArgs().requestId).toBe('string')
    expect(typeof getValidatorCompletionArgs().initiatedAt).toBe('string')
    expect(typeof getValidatorCompletionArgs().completedAt).toBe('string')
  })

  it('sends the rights trigger contract without callback fields', async () => {
    process.env.RIGHTS_DETERMINATOR_BASE_URL = 'http://localhost:8007'
    process.env.RIGHTS_DETERMINE_TRIGGER_TOKEN = 'rights-trigger-token'

    let receivedBody: string | null = null
    vi.mocked(fetch).mockImplementation((_input, init) => {
      receivedBody = typeof init?.body === 'string' ? init.body : null
      return Promise.resolve(
        buildJsonResponse({
          app: 'preserv-dashboard',
          batch_id: 'batch-1',
          processed_count: 4,
          rights_determined_count: 2,
          under_review_count: 1,
          failed_count: 1,
          failures: [],
        }),
      )
    })

    await triggerRightsDeterminator(
      buildBatchStatus({
        pipelineRequestedStages: ['metadata-extraction', 'metadata-validation', 'rights-determinator'],
      }),
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(receivedBody).not.toBeNull()
    if (receivedBody === null) {
      throw new Error('Expected dashboard to send a JSON string body to rights-determinator.')
    }

    const payload = JSON.parse(receivedBody) as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['app', 'batch_id', 'initiated_at'])
    expect(payload.app).toBe('preserv-dashboard')
    expect(payload.batch_id).toBe('batch-1')
    expect(typeof payload.initiated_at).toBe('string')
    expect(mockRecordRightsDeterminatorCompletion.mock.calls[0]?.[0]).toBe('batch-1')
    expect(getRightsDeterminatorCompletionArgs()).toMatchObject({
      processedCount: 4,
      rightsDeterminedCount: 2,
      underReviewCount: 1,
      failedCount: 1,
    })
    expect(typeof getRightsDeterminatorCompletionArgs().requestId).toBe('string')
    expect(typeof getRightsDeterminatorCompletionArgs().initiatedAt).toBe('string')
    expect(typeof getRightsDeterminatorCompletionArgs().completedAt).toBe('string')
  })
})
