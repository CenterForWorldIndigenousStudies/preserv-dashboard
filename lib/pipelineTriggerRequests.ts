import { randomUUID } from 'node:crypto'

import {
  CONTENT_DEDUP_CALLBACK_PATH,
  DOCUMENT_SPLITTER_CALLBACK_PATH,
  OCR_PROCESSOR_CALLBACK_PATH,
  PAGE_ROTATOR_CALLBACK_PATH,
} from '@constants/paths'
import { DASHBOARD_BASE_URL } from '@constants/server'
import { logEvent } from '@lib/observability'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

type TriggerConfig = {
  serviceName: 'document_splitter' | 'page_rotator' | 'ocr_processor' | 'content_dedup'
  baseUrlEnv: string
  triggerTokenEnv: string
  callbackTokenEnv: string
  callbackPath: string
  endpointPath: string
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

async function triggerPipelineService(batch: ProcessBatchStatus, config: TriggerConfig): Promise<void> {
  const baseUrl = readRequiredEnv(config.baseUrlEnv, `${config.baseUrlEnv} is not configured.`)
  const triggerToken = readRequiredEnv(config.triggerTokenEnv, `${config.triggerTokenEnv} is not configured.`)
  const callbackToken = readRequiredEnv(config.callbackTokenEnv, `${config.callbackTokenEnv} is not configured.`)

  if (!batch.startedBy) {
    throw new Error(`Batch ${batch.batchId} is missing startedBy.`)
  }

  const requestId = randomUUID()
  const callbackUrl = buildStageCallbackUrl(config.callbackPath)
  const payload = {
    app: 'preserv-dashboard',
    request_id: requestId,
    batch_id: batch.batchId,
    started_by: batch.startedBy,
    initiated_at: new Date().toISOString(),
    callback: {
      url: callbackUrl,
      token: callbackToken,
    },
  }

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
