import { randomUUID } from 'node:crypto'

import {
  CONTENT_DEDUP_CALLBACK_PATH,
  DOCUMENT_SPLITTER_CALLBACK_PATH,
  METADATA_EXTRACTOR_CALLBACK_PATH,
  METADATA_VALIDATOR_CALLBACK_PATH,
  OCR_PROCESSOR_CALLBACK_PATH,
  PAGE_ROTATOR_CALLBACK_PATH,
  RIGHTS_DETERMINATOR_CALLBACK_PATH,
} from '@constants/paths'
import { DASHBOARD_BASE_URL } from '@constants/server'
import { logEvent } from '@lib/observability'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

type TriggerConfig = {
  serviceName:
    | 'document_splitter'
    | 'page_rotator'
    | 'ocr_processor'
    | 'content_dedup'
    | 'metadata_extractor'
    | 'metadata_validator'
    | 'rights_determinator'
  endpointPath: string
  callbackPath: string
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

function createAsyncCallbackPayload(
  batch: ProcessBatchStatus,
  initiatedAt: string,
  requestId: string,
  callbackUrl: string,
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
      token: readRequiredEnv('PIPELINE_CALLBACK_TOKEN', 'PIPELINE_CALLBACK_TOKEN is not configured.'),
    },
  }
}

async function triggerPipelineService(batch: ProcessBatchStatus, config: TriggerConfig): Promise<void> {
  const baseUrl = readRequiredEnv('PIPELINE_API_BASE_URL', 'PIPELINE_API_BASE_URL is not configured.')
  const triggerToken = readRequiredEnv('PIPELINE_TRIGGER_TOKEN', 'PIPELINE_TRIGGER_TOKEN is not configured.')
  const requestId = randomUUID()
  const initiatedAt = new Date().toISOString()
  const callbackUrl = buildStageCallbackUrl(config.callbackPath)
  const payload = createAsyncCallbackPayload(batch, initiatedAt, requestId, callbackUrl)

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
    const errorMessage = getErrorMessage(
      responseBody,
      `${config.serviceName.replaceAll('_', '-')} returned ${response.status}`,
    )
    logEvent('error', `${config.serviceName}_trigger_failed`, {
      batchId: batch.batchId,
      batchName: batch.batchName,
      requestId,
      statusCode: response.status,
      errorMessage,
    })
    throw new Error(errorMessage)
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
    callbackPath: DOCUMENT_SPLITTER_CALLBACK_PATH,
    endpointPath: '/split',
  })
}

export async function triggerPageRotator(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'page_rotator',
    callbackPath: PAGE_ROTATOR_CALLBACK_PATH,
    endpointPath: '/rotate',
  })
}

export async function triggerOcrProcessor(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'ocr_processor',
    callbackPath: OCR_PROCESSOR_CALLBACK_PATH,
    endpointPath: '/ocr',
  })
}

export async function triggerContentDedup(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'content_dedup',
    callbackPath: CONTENT_DEDUP_CALLBACK_PATH,
    endpointPath: '/content-dedup',
  })
}

export async function triggerMetadataExtractor(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'metadata_extractor',
    callbackPath: METADATA_EXTRACTOR_CALLBACK_PATH,
    endpointPath: '/metadata-extractor',
  })
}

export async function triggerMetadataValidator(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'metadata_validator',
    callbackPath: METADATA_VALIDATOR_CALLBACK_PATH,
    endpointPath: '/metadata-validator',
  })
}

export async function triggerRightsDeterminator(batch: ProcessBatchStatus): Promise<void> {
  await triggerPipelineService(batch, {
    serviceName: 'rights_determinator',
    callbackPath: RIGHTS_DETERMINATOR_CALLBACK_PATH,
    endpointPath: '/rights-determinator',
  })
}
