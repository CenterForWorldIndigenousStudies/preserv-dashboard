import { randomUUID } from 'node:crypto'

import {
  CONTENT_DEDUP_CALLBACK_PATH,
  DOCUMENT_SPLITTER_CALLBACK_PATH,
  OCR_PROCESSOR_CALLBACK_PATH,
  PAGE_ROTATOR_CALLBACK_PATH,
} from '@constants/paths'
import {
  CONTENT_DEDUP_STAGE,
  DOCUMENT_SPLITTER_STAGE,
  OCR_PROCESSOR_STAGE,
  PAGE_ROTATOR_STAGE,
} from '@constants/pipeline'
import { DASHBOARD_BASE_URL } from '@constants/server'
import {
  getNextEligibleExecutionStep,
  getPipelineConfigForBatch,
  isPipelineBatchTerminal,
} from '@lib/pipelineExecution'
import { logEvent } from '@lib/observability'
import { type ProcessBatchStatus } from '@lib/processBatches'
import type { PipelineExecutionStep } from '@lib/pipelineConfig'

function normalizeRequestedStages(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
}

function buildStageCallbackUrl(pathname: string): string {
  return new URL(pathname, DASHBOARD_BASE_URL).toString()
}

export function normalizeRequestedProcessStages(value: unknown): string[] {
  return normalizeRequestedStages(value).filter(
    (stage) =>
      stage === DOCUMENT_SPLITTER_STAGE ||
      stage === PAGE_ROTATOR_STAGE ||
      stage === OCR_PROCESSOR_STAGE ||
      stage === CONTENT_DEDUP_STAGE,
  )
}

function isNextEligibleStep(
  batch: ProcessBatchStatus,
  stage: PipelineExecutionStep['service'],
  pass?: 1 | 2,
): boolean {
  const nextStep = getNextEligibleExecutionStep(batch)
  if (!nextStep) {
    return false
  }

  return nextStep.service === stage && nextStep.pass === pass
}

export function shouldTriggerDocumentSplitter(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, DOCUMENT_SPLITTER_STAGE, 1) || isNextEligibleStep(batch, DOCUMENT_SPLITTER_STAGE, 2)
}

export function shouldTriggerPageRotator(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, PAGE_ROTATOR_STAGE, 1) || isNextEligibleStep(batch, PAGE_ROTATOR_STAGE, 2)
}

export function shouldTriggerOcrProcessor(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, OCR_PROCESSOR_STAGE)
}

export function shouldTriggerContentDedup(batch: ProcessBatchStatus): boolean {
  getPipelineConfigForBatch(batch)
  return isNextEligibleStep(batch, CONTENT_DEDUP_STAGE)
}

export function shouldCloseProcessStream(batch: ProcessBatchStatus): boolean {
  return isPipelineBatchTerminal(batch)
}

export async function triggerDocumentSplitter(batch: ProcessBatchStatus): Promise<void> {
  const splitterBaseUrl = process.env.DOCUMENT_SPLITTER_BASE_URL?.trim()
  const triggerToken = process.env.DOCUMENT_SPLITTER_TRIGGER_TOKEN?.trim()
  const callbackToken = process.env.DOCUMENT_SPLITTER_CALLBACK_TOKEN?.trim()
  if (!splitterBaseUrl) {
    throw new Error('DOCUMENT_SPLITTER_BASE_URL is not configured.')
  }
  if (!triggerToken) {
    throw new Error('DOCUMENT_SPLITTER_TRIGGER_TOKEN is not configured.')
  }
  if (!callbackToken) {
    throw new Error('DOCUMENT_SPLITTER_CALLBACK_TOKEN is not configured.')
  }
  if (!batch.startedBy) {
    throw new Error(`Batch ${batch.batchId} is missing startedBy.`)
  }

  const requestId = randomUUID()
  const callbackUrl = buildStageCallbackUrl(DOCUMENT_SPLITTER_CALLBACK_PATH)
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

  logEvent('info', 'document_splitter_trigger_requested', {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    startedBy: batch.startedBy,
    callbackUrl,
  })

  const response = await fetch(new URL('/split', splitterBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${triggerToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    responseBody = undefined
  }

  if (!response.ok) {
    const errorMessage =
      typeof responseBody === 'object' &&
      responseBody !== null
        ? 'error' in responseBody && typeof responseBody.error === 'string'
          ? responseBody.error
          : 'detail' in responseBody && typeof responseBody.detail === 'string'
            ? responseBody.detail
            : `document-splitter returned ${response.status}`
        : `document-splitter returned ${response.status}`
    logEvent('error', 'document_splitter_trigger_failed', {
      batchId: batch.batchId,
      batchName: batch.batchName,
      requestId,
      statusCode: response.status,
      errorMessage,
    })
    throw new Error(errorMessage)
  }

  logEvent('info', 'document_splitter_trigger_accepted', {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    statusCode: response.status,
  })
}

export async function triggerPageRotator(batch: ProcessBatchStatus): Promise<void> {
  const pageRotatorBaseUrl = process.env.PAGE_ROTATOR_BASE_URL?.trim()
  const triggerToken = process.env.PAGE_ROTATOR_TRIGGER_TOKEN?.trim()
  const callbackToken = process.env.PAGE_ROTATOR_CALLBACK_TOKEN?.trim()
  if (!pageRotatorBaseUrl) {
    throw new Error('PAGE_ROTATOR_BASE_URL is not configured.')
  }
  if (!triggerToken) {
    throw new Error('PAGE_ROTATOR_TRIGGER_TOKEN is not configured.')
  }
  if (!callbackToken) {
    throw new Error('PAGE_ROTATOR_CALLBACK_TOKEN is not configured.')
  }
  if (!batch.startedBy) {
    throw new Error(`Batch ${batch.batchId} is missing startedBy.`)
  }

  const requestId = randomUUID()
  const callbackUrl = buildStageCallbackUrl(PAGE_ROTATOR_CALLBACK_PATH)
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

  logEvent('info', 'page_rotator_trigger_requested', {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    startedBy: batch.startedBy,
    callbackUrl,
  })

  const response = await fetch(new URL('/rotate', pageRotatorBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${triggerToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    responseBody = undefined
  }

  if (!response.ok) {
    const errorMessage =
      typeof responseBody === 'object' && responseBody !== null
        ? 'error' in responseBody && typeof responseBody.error === 'string'
          ? responseBody.error
          : 'detail' in responseBody && typeof responseBody.detail === 'string'
            ? responseBody.detail
            : `page-rotator returned ${response.status}`
        : `page-rotator returned ${response.status}`
    logEvent('error', 'page_rotator_trigger_failed', {
      batchId: batch.batchId,
      batchName: batch.batchName,
      requestId,
      statusCode: response.status,
      errorMessage,
    })
    throw new Error(errorMessage)
  }

  logEvent('info', 'page_rotator_trigger_accepted', {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    statusCode: response.status,
  })
}

export async function triggerOcrProcessor(batch: ProcessBatchStatus): Promise<void> {
  const ocrProcessorBaseUrl = process.env.OCR_PROCESSOR_BASE_URL?.trim()
  const triggerToken = process.env.OCR_PROCESSOR_TRIGGER_TOKEN?.trim()
  const callbackToken = process.env.OCR_PROCESSOR_CALLBACK_TOKEN?.trim()
  if (!ocrProcessorBaseUrl) {
    throw new Error('OCR_PROCESSOR_BASE_URL is not configured.')
  }
  if (!triggerToken) {
    throw new Error('OCR_PROCESSOR_TRIGGER_TOKEN is not configured.')
  }
  if (!callbackToken) {
    throw new Error('OCR_PROCESSOR_CALLBACK_TOKEN is not configured.')
  }
  if (!batch.startedBy) {
    throw new Error(`Batch ${batch.batchId} is missing startedBy.`)
  }

  const requestId = randomUUID()
  const callbackUrl = buildStageCallbackUrl(OCR_PROCESSOR_CALLBACK_PATH)
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

  logEvent('info', 'ocr_processor_trigger_requested', {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    startedBy: batch.startedBy,
    callbackUrl,
  })

  const response = await fetch(new URL('/ocr', ocrProcessorBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${triggerToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    responseBody = undefined
  }

  if (!response.ok) {
    const errorMessage =
      typeof responseBody === 'object' && responseBody !== null
        ? 'error' in responseBody && typeof responseBody.error === 'string'
          ? responseBody.error
          : 'detail' in responseBody && typeof responseBody.detail === 'string'
            ? responseBody.detail
            : `ocr-processor returned ${response.status}`
        : `ocr-processor returned ${response.status}`
    logEvent('error', 'ocr_processor_trigger_failed', {
      batchId: batch.batchId,
      batchName: batch.batchName,
      requestId,
      statusCode: response.status,
      errorMessage,
    })
    throw new Error(errorMessage)
  }

  logEvent('info', 'ocr_processor_trigger_accepted', {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    statusCode: response.status,
  })
}

export async function triggerContentDedup(batch: ProcessBatchStatus): Promise<void> {
  const contentDedupBaseUrl = process.env.CONTENT_DEDUP_BASE_URL?.trim()
  const triggerToken = process.env.CONTENT_DEDUP_TRIGGER_TOKEN?.trim()
  const callbackToken = process.env.CONTENT_DEDUP_CALLBACK_TOKEN?.trim()
  if (!contentDedupBaseUrl) {
    throw new Error('CONTENT_DEDUP_BASE_URL is not configured.')
  }
  if (!triggerToken) {
    throw new Error('CONTENT_DEDUP_TRIGGER_TOKEN is not configured.')
  }
  if (!callbackToken) {
    throw new Error('CONTENT_DEDUP_CALLBACK_TOKEN is not configured.')
  }
  if (!batch.startedBy) {
    throw new Error(`Batch ${batch.batchId} is missing startedBy.`)
  }

  const requestId = randomUUID()
  const callbackUrl = buildStageCallbackUrl(CONTENT_DEDUP_CALLBACK_PATH)
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

  logEvent('info', 'content_dedup_trigger_requested', {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    startedBy: batch.startedBy,
    callbackUrl,
  })

  const response = await fetch(new URL('/content-dedup', contentDedupBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${triggerToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    responseBody = undefined
  }

  if (!response.ok) {
    const errorMessage =
      typeof responseBody === 'object' && responseBody !== null
        ? 'error' in responseBody && typeof responseBody.error === 'string'
          ? responseBody.error
          : 'detail' in responseBody && typeof responseBody.detail === 'string'
            ? responseBody.detail
            : `content-dedup returned ${response.status}`
        : `content-dedup returned ${response.status}`
    logEvent('error', 'content_dedup_trigger_failed', {
      batchId: batch.batchId,
      batchName: batch.batchName,
      requestId,
      statusCode: response.status,
      errorMessage,
    })
    throw new Error(errorMessage)
  }

  logEvent('info', 'content_dedup_trigger_accepted', {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    statusCode: response.status,
  })
}
