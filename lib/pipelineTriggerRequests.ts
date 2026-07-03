import { randomUUID } from 'node:crypto'

import {
  CONTENT_DEDUP_CALLBACK_PATH,
  DOCUMENT_SPLITTER_CALLBACK_PATH,
  OCR_PROCESSOR_CALLBACK_PATH,
  PAGE_ROTATOR_CALLBACK_PATH,
} from '@constants/paths'
import { DASHBOARD_BASE_URL } from '@constants/server'
import { logEvent } from '@lib/observability'
import {
  recordMetadataExtractorCompletion,
  recordMetadataValidatorCompletion,
  recordRightsDeterminatorCompletion,
} from '@lib/processBatches'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

type TriggerConfig = {
  serviceName:
    | 'document_splitter'
    | 'page_rotator'
    | 'ocr_processor'
    | 'content_dedup'
    | 'metadata_extractor'
    | 'rights_determinator'
    | 'metadata_validator'
  baseUrlEnv: string
  triggerTokenEnv: string
  endpointPath: string
  callbackTokenEnv?: string
  callbackPath?: string
  payloadMode?: 'async-callback' | 'metadata-extractor' | 'metadata-validator' | 'rights-determinator'
}

function buildStageCallbackUrl(pathname: string): string {
  return new URL(pathname, DASHBOARD_BASE_URL).toString()
}

async function parseResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function readRequiredEnv(name: string, message: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(message)
  }

  return value
}

function getErrorMessage(responseBody: unknown, fallback: string): string {
  if (typeof responseBody !== 'object' || responseBody === null) {
    return fallback
  }

  if ('error' in responseBody && typeof responseBody.error === 'string') {
    return responseBody.error
  }

  if ('detail' in responseBody && typeof responseBody.detail === 'string') {
    return responseBody.detail
  }

  return fallback
}

function parseFiniteCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function createSynchronousPayload(batchId: string, initiatedAt: string): Record<string, string> {
  return {
    app: 'preserv-dashboard',
    batch_id: batchId,
    initiated_at: initiatedAt,
  }
}

function createAsyncCallbackPayload(
  batch: ProcessBatchStatus,
  initiatedAt: string,
  requestId: string,
  callbackUrl: string | null,
  callbackTokenEnv: string | undefined,
): Record<string, unknown> {
  if (!batch.startedBy) {
    throw new Error(`Batch ${batch.batchId} is missing startedBy.`)
  }

  return {
    app: 'preserv-dashboard',
    request_id: requestId,
    batch_id: batch.batchId,
    started_by: batch.startedBy,
    initiated_at: initiatedAt,
    callback: {
      url: callbackUrl,
      token: readRequiredEnv(callbackTokenEnv ?? '', `${callbackTokenEnv} is not configured.`),
    },
  }
}

function buildTriggerPayload(
  batch: ProcessBatchStatus,
  config: TriggerConfig,
  initiatedAt: string,
  requestId: string,
  callbackUrl: string | null,
): Record<string, unknown> {
  return config.payloadMode === 'metadata-extractor' || config.payloadMode === 'metadata-validator'
    || config.payloadMode === 'rights-determinator'
    ? createSynchronousPayload(batch.batchId, initiatedAt)
    : createAsyncCallbackPayload(batch, initiatedAt, requestId, callbackUrl, config.callbackTokenEnv)
}

async function persistSynchronousCompletion(
  batchId: string,
  payloadMode: 'metadata-extractor' | 'metadata-validator' | 'rights-determinator',
  requestId: string,
  initiatedAt: string,
  responseBody: unknown,
): Promise<void> {
  const typedResponseBody = responseBody as
    | {
        processed_count?: unknown
        extracted_count?: unknown
        metadata_validated_count?: unknown
        rights_determined_count?: unknown
        under_review_count?: unknown
        failed_count?: unknown
      }
    | undefined

  const processedCount = parseFiniteCount(typedResponseBody?.processed_count)
  const failedCount = parseFiniteCount(typedResponseBody?.failed_count)
  const completedAt = new Date().toISOString()

  if (payloadMode === 'metadata-extractor') {
    await recordMetadataExtractorCompletion(batchId, {
      requestId,
      initiatedAt,
      completedAt,
      processedCount,
      extractedCount: parseFiniteCount(typedResponseBody?.extracted_count),
      failedCount,
    })
    return
  }

  if (payloadMode === 'rights-determinator') {
    await recordRightsDeterminatorCompletion(batchId, {
      requestId,
      initiatedAt,
      completedAt,
      processedCount,
      rightsDeterminedCount: parseFiniteCount(typedResponseBody?.rights_determined_count),
      underReviewCount: parseFiniteCount(typedResponseBody?.under_review_count),
      failedCount,
    })
    return
  }

  await recordMetadataValidatorCompletion(batchId, {
    requestId,
    initiatedAt,
    completedAt,
    processedCount,
    metadataValidatedCount: parseFiniteCount(typedResponseBody?.metadata_validated_count),
    underReviewCount: parseFiniteCount(typedResponseBody?.under_review_count),
    failedCount,
  })
}

async function triggerPipelineService(batch: ProcessBatchStatus, config: TriggerConfig): Promise<void> {
  const baseUrl = readRequiredEnv(config.baseUrlEnv, `${config.baseUrlEnv} is not configured.`)
  const triggerToken = readRequiredEnv(config.triggerTokenEnv, `${config.triggerTokenEnv} is not configured.`)
  const requestId = randomUUID()
  const initiatedAt = new Date().toISOString()
  const callbackUrl = config.callbackPath ? buildStageCallbackUrl(config.callbackPath) : null
  const payload = buildTriggerPayload(batch, config, initiatedAt, requestId, callbackUrl)

  logEvent('info', `${config.serviceName}_trigger_requested`, {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    startedBy: batch.startedBy,
    callbackUrl,
  })

  const response = await fetch(new URL(config.endpointPath, baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${triggerToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const responseBody = await parseResponseBody(response)

  if (!response.ok) {
    const errorMessage = getErrorMessage(responseBody, `${config.serviceName.replaceAll('_', '-')} returned ${response.status}`)
    logEvent('error', `${config.serviceName}_trigger_failed`, {
      batchId: batch.batchId,
      batchName: batch.batchName,
      requestId,
      statusCode: response.status,
      errorMessage,
    })
    throw new Error(errorMessage)
  }

  if (
    config.payloadMode === 'metadata-extractor' ||
    config.payloadMode === 'metadata-validator' ||
    config.payloadMode === 'rights-determinator'
  ) {
    await persistSynchronousCompletion(batch.batchId, config.payloadMode, requestId, initiatedAt, responseBody)
  }

  logEvent('info', `${config.serviceName}_trigger_accepted`, {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    statusCode: response.status,
  })
}

export async function triggerDocumentSplitter(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'document_splitter',
    baseUrlEnv: 'DOCUMENT_SPLITTER_BASE_URL',
    triggerTokenEnv: 'DOCUMENT_SPLITTER_TRIGGER_TOKEN',
    callbackTokenEnv: 'DOCUMENT_SPLITTER_CALLBACK_TOKEN',
    callbackPath: DOCUMENT_SPLITTER_CALLBACK_PATH,
    endpointPath: '/split',
  })
}

export async function triggerPageRotator(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'page_rotator',
    baseUrlEnv: 'PAGE_ROTATOR_BASE_URL',
    triggerTokenEnv: 'PAGE_ROTATOR_TRIGGER_TOKEN',
    callbackTokenEnv: 'PAGE_ROTATOR_CALLBACK_TOKEN',
    callbackPath: PAGE_ROTATOR_CALLBACK_PATH,
    endpointPath: '/rotate',
  })
}

export async function triggerOcrProcessor(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'ocr_processor',
    baseUrlEnv: 'OCR_PROCESSOR_BASE_URL',
    triggerTokenEnv: 'OCR_PROCESSOR_TRIGGER_TOKEN',
    callbackTokenEnv: 'OCR_PROCESSOR_CALLBACK_TOKEN',
    callbackPath: OCR_PROCESSOR_CALLBACK_PATH,
    endpointPath: '/ocr',
  })
}

export async function triggerContentDedup(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'content_dedup',
    baseUrlEnv: 'CONTENT_DEDUP_BASE_URL',
    triggerTokenEnv: 'CONTENT_DEDUP_TRIGGER_TOKEN',
    callbackTokenEnv: 'CONTENT_DEDUP_CALLBACK_TOKEN',
    callbackPath: CONTENT_DEDUP_CALLBACK_PATH,
    endpointPath: '/content-dedup',
  })
}

export async function triggerMetadataExtractor(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'metadata_extractor',
    baseUrlEnv: 'METADATA_EXTRACTOR_BASE_URL',
    triggerTokenEnv: 'METADATA_EXTRACTOR_TRIGGER_TOKEN',
    endpointPath: '/metadata-extractor',
    payloadMode: 'metadata-extractor',
  })
}

export async function triggerMetadataValidator(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'metadata_validator',
    baseUrlEnv: 'MD_VALIDATE_BASE_URL',
    triggerTokenEnv: 'MD_VALIDATE_TRIGGER_TOKEN',
    endpointPath: '/metadata-validator',
    payloadMode: 'metadata-validator',
  })
}

export async function triggerRightsDeterminator(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'rights_determinator',
    baseUrlEnv: 'RIGHTS_DETERMINATOR_BASE_URL',
    triggerTokenEnv: 'RIGHTS_DETERMINE_TRIGGER_TOKEN',
    endpointPath: '/rights-determinator',
    payloadMode: 'rights-determinator',
  })
}
