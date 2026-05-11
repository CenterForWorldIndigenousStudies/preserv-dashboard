import { randomUUID } from 'node:crypto'

import { DOCUMENT_SPLITTER_CALLBACK_PATH } from '@constants/paths'
import { DOCUMENT_SPLITTER_STAGE } from '@constants/pipeline'
import { DASHBOARD_BASE_URL } from '@constants/server'
import { logEvent } from '@lib/observability'
import {
  type ProcessBatchStatus,
  type ProcessStageStatus,
} from '@lib/processBatches'

const SPLITTER_NON_RETRIGGERABLE_STATUSES = new Set(['queued', 'running', 'completed'])

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
  return normalizeRequestedStages(value).filter((stage) => stage === DOCUMENT_SPLITTER_STAGE)
}

export function shouldTriggerDocumentSplitter(batch: ProcessBatchStatus): boolean {
  const ingestStatus = batch.ingester?.status ?? null
  if (ingestStatus !== 'completed') {
    return false
  }

  if (!batch.pipelineRequestedStages.includes(DOCUMENT_SPLITTER_STAGE)) {
    return false
  }

  const splitterStatus = batch.documentSplitter?.status ?? null
  return !SPLITTER_NON_RETRIGGERABLE_STATUSES.has(splitterStatus ?? '')
}

export function isStageTerminal(stage: ProcessStageStatus | null): boolean {
  return stage?.status === 'completed' || stage?.status === 'failed'
}

export function shouldCloseProcessStream(batch: ProcessBatchStatus): boolean {
  if (!batch.ingester) {
    return false
  }

  if (!isStageTerminal(batch.ingester)) {
    return false
  }

  if (batch.pipelineRequestedStages.length === 0) {
    return true
  }

  return batch.pipelineRequestedStages.every((stage) => {
    if (stage === DOCUMENT_SPLITTER_STAGE) {
      return isStageTerminal(batch.documentSplitter)
    }

    return false
  })
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
