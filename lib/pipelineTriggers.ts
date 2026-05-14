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
import { logEvent } from '@lib/observability'
import {
  type ProcessBatchStatus,
  type ProcessStageStatus,
} from '@lib/processBatches'

const NON_RETRIGGERABLE_STATUSES = new Set(['queued', 'running', 'review_needed', 'failed'])

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

export function shouldTriggerDocumentSplitter(batch: ProcessBatchStatus): boolean {
  const ingestStatus = batch.ingester?.status ?? null
  if (ingestStatus !== 'completed') {
    return false
  }

  if (!batch.pipelineRequestedStages.includes(DOCUMENT_SPLITTER_STAGE)) {
    return false
  }

  const splitter = batch.documentSplitter
  const splitterStatus = splitter?.status ?? null
  if (NON_RETRIGGERABLE_STATUSES.has(splitterStatus ?? '')) {
    return false
  }

  const completedPasses = splitter?.completedPasses.length ?? 0
  const maxPasses = splitter?.maxPasses ?? (batch.pipelineRequestedStages.includes(PAGE_ROTATOR_STAGE) ? 2 : 1)
  if (completedPasses >= maxPasses) {
    return false
  }

  if (completedPasses === 0) {
    return true
  }

  if (!batch.pipelineRequestedStages.includes(PAGE_ROTATOR_STAGE)) {
    return false
  }

  return (batch.pageRotator?.completedPasses.length ?? 0) >= completedPasses
}

export function shouldTriggerPageRotator(batch: ProcessBatchStatus): boolean {
  const ingestStatus = batch.ingester?.status ?? null
  if (ingestStatus !== 'completed') {
    return false
  }

  if (!batch.pipelineRequestedStages.includes(PAGE_ROTATOR_STAGE)) {
    return false
  }

  const pageRotator = batch.pageRotator
  const pageRotatorStatus = pageRotator?.status ?? null
  if (NON_RETRIGGERABLE_STATUSES.has(pageRotatorStatus ?? '')) {
    return false
  }

  const completedPasses = pageRotator?.completedPasses.length ?? 0
  const maxPasses = pageRotator?.maxPasses ?? (batch.pipelineRequestedStages.includes(DOCUMENT_SPLITTER_STAGE) ? 2 : 1)
  if (completedPasses >= maxPasses) {
    return false
  }

  if (!batch.pipelineRequestedStages.includes(DOCUMENT_SPLITTER_STAGE)) {
    return completedPasses === 0
  }

  const splitterCompletedPasses = batch.documentSplitter?.completedPasses.length ?? 0
  return splitterCompletedPasses > completedPasses
}

export function shouldTriggerOcrProcessor(batch: ProcessBatchStatus): boolean {
  const ingestStatus = batch.ingester?.status ?? null
  if (ingestStatus !== 'completed') {
    return false
  }

  if (!batch.pipelineRequestedStages.includes(OCR_PROCESSOR_STAGE)) {
    return false
  }

  if (batch.pipelineRequestedStages.includes(PAGE_ROTATOR_STAGE)) {
    const pageRotator = batch.pageRotator
    if (!pageRotator || pageRotator.status !== 'completed' || pageRotator.completedPasses.length < pageRotator.maxPasses) {
      return false
    }
  } else if (batch.pipelineRequestedStages.includes(DOCUMENT_SPLITTER_STAGE)) {
    const splitter = batch.documentSplitter
    if (!splitter || splitter.status !== 'completed' || splitter.completedPasses.length < splitter.maxPasses) {
      return false
    }
  }

  const ocrProcessorStatus = batch.ocrProcessor?.status ?? null
  return !NON_RETRIGGERABLE_STATUSES.has(ocrProcessorStatus ?? '') && ocrProcessorStatus !== 'completed'
}

export function shouldTriggerContentDedup(batch: ProcessBatchStatus): boolean {
  const ingestStatus = batch.ingester?.status ?? null
  if (ingestStatus !== 'completed') {
    return false
  }

  if (!batch.pipelineRequestedStages.includes(CONTENT_DEDUP_STAGE)) {
    return false
  }

  if (batch.pipelineRequestedStages.includes(OCR_PROCESSOR_STAGE)) {
    if (batch.ocrProcessor?.status !== 'completed') {
      return false
    }
  } else if (batch.pipelineRequestedStages.includes(PAGE_ROTATOR_STAGE)) {
    const pageRotator = batch.pageRotator
    if (
      !pageRotator ||
      pageRotator.status !== 'completed' ||
      pageRotator.completedPasses.length < pageRotator.maxPasses
    ) {
      return false
    }
  } else if (batch.pipelineRequestedStages.includes(DOCUMENT_SPLITTER_STAGE)) {
    const splitter = batch.documentSplitter
    if (
      !splitter ||
      splitter.status !== 'completed' ||
      splitter.completedPasses.length < splitter.maxPasses
    ) {
      return false
    }
  }

  const contentDedupStatus = batch.contentDedup?.status ?? null
  return (
    !NON_RETRIGGERABLE_STATUSES.has(contentDedupStatus ?? '') &&
    contentDedupStatus !== 'completed'
  )
}

export function isStageTerminal(stage: ProcessStageStatus | null): boolean {
  return stage?.status === 'completed' || stage?.status === 'failed' || stage?.status === 'review_needed'
}

function hasRequestedStageFailure(batch: ProcessBatchStatus): boolean {
  return (
    (batch.pipelineRequestedStages.includes(DOCUMENT_SPLITTER_STAGE) &&
      (batch.documentSplitter?.status === 'failed' ||
        batch.documentSplitter?.status === 'review_needed')) ||
    (batch.pipelineRequestedStages.includes(PAGE_ROTATOR_STAGE) &&
      (batch.pageRotator?.status === 'failed' ||
        batch.pageRotator?.status === 'review_needed')) ||
    (batch.pipelineRequestedStages.includes(OCR_PROCESSOR_STAGE) &&
      (batch.ocrProcessor?.status === 'failed' ||
        batch.ocrProcessor?.status === 'review_needed')) ||
    (batch.pipelineRequestedStages.includes(CONTENT_DEDUP_STAGE) &&
      (batch.contentDedup?.status === 'failed' ||
        batch.contentDedup?.status === 'review_needed'))
  )
}

function isRequestedStageTerminal(batch: ProcessBatchStatus, stage: string): boolean {
  if (stage === DOCUMENT_SPLITTER_STAGE) {
    return isStageTerminal(batch.documentSplitter)
  }
  if (stage === PAGE_ROTATOR_STAGE) {
    return isStageTerminal(batch.pageRotator)
  }
  if (stage === OCR_PROCESSOR_STAGE) {
    return isStageTerminal(batch.ocrProcessor)
  }
  if (stage === CONTENT_DEDUP_STAGE) {
    return isStageTerminal(batch.contentDedup)
  }

  return false
}

export function shouldCloseProcessStream(batch: ProcessBatchStatus): boolean {
  if (!batch.ingester) {
    return false
  }

  if (!isStageTerminal(batch.ingester)) {
    return false
  }

  if (batch.ingester.status === 'failed') {
    return true
  }

  if (batch.pipelineRequestedStages.length === 0) {
    return true
  }

  if (hasRequestedStageFailure(batch)) {
    return true
  }

  return batch.pipelineRequestedStages.every((stage) =>
    isRequestedStageTerminal(batch, stage),
  )
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
