import { randomUUID } from 'node:crypto'

import {
  CONTENT_DEDUP_CALLBACK_PATH,
  DATA_INGESTER_CALLBACK_PATH,
  DATA_INGESTER_REPROCESS_CALLBACK_PATH,
  FEDORA_INGESTER_CALLBACK_PATH,
  DOCUMENT_SPLITTER_CALLBACK_PATH,
  METADATA_EXTRACTOR_CALLBACK_PATH,
  OCR_PROCESSOR_CALLBACK_PATH,
  PAGE_ROTATOR_CALLBACK_PATH,
} from '@constants/paths'
import { DASHBOARD_BASE_URL } from '@constants/server'
import {
  CONTENT_DEDUP_SERVICE,
  DATA_INGESTER_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  FEDORA_INGESTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
  type ServiceId,
} from '@constants/pipeline'
import { logEvent } from '@lib/observability'
import { normalizePipelineExecutionContext, type PipelineExecutionContextInput } from '@lib/pipelineExecutionContext'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

type TriggerConfig = {
  serviceName: ServiceId
  endpointPath: string
  callbackPath: string
  includeSourceFolderIds?: boolean
  includeBatchName?: boolean
}

export interface PipelineTriggerAcceptedResponse {
  batchId: string | null
  status: string | null
  service: string | null
}

type ReprocessTriggerConfig = {
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

type ValidationErrorDetail = {
  loc?: unknown
  msg?: unknown
  type?: unknown
}

function getResponseDetails(responseBody: unknown): ValidationErrorDetail[] | undefined {
  if (typeof responseBody !== 'object' || responseBody === null || !('detail' in responseBody)) {
    return undefined
  }

  const detail = responseBody.detail
  if (!Array.isArray(detail)) {
    return undefined
  }

  return detail.filter(
    (item): item is ValidationErrorDetail => typeof item === 'object' && item !== null,
  )
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

  const responseDetails = getResponseDetails(responseBody)
  if (responseDetails && responseDetails.length > 0) {
    const messages = responseDetails
      .map((detail) => {
        const location = Array.isArray(detail.loc) ? detail.loc.join('.') : undefined
        const message = typeof detail.msg === 'string' ? detail.msg : 'Request validation failed'
        return location ? `${location}: ${message}` : message
      })
      .filter((message, index, values) => values.indexOf(message) === index)

    if (messages.length > 0) {
      return messages.join('; ')
    }
  }

  return fallback
}

function getPayloadSummary(payload: Record<string, unknown>): Record<string, unknown> {
  const pipelineConfig = payload.pipeline_config
  const pipelineConfigRecord =
    typeof pipelineConfig === 'object' && pipelineConfig !== null
      ? (pipelineConfig as Record<string, unknown>)
      : null
  const count = (value: unknown): number => (Array.isArray(value) ? value.length : 0)

  return {
    draftBatchId: payload.draft_batch_id,
    executionMode: payload.execution_mode,
    hasCallback: typeof payload.callback === 'object' && payload.callback !== null,
    hasPipelineConfig: pipelineConfigRecord !== null,
    pipelineConfigKeys: pipelineConfigRecord ? Object.keys(pipelineConfigRecord).sort() : [],
    pipelineConfigSourceDocumentCount: count(pipelineConfigRecord?.sourceDocumentIds),
    pipelineConfigSourceFolderCount: count(pipelineConfigRecord?.sourceFolderIds),
    pipelineConfigExecutionPlanCount: count(pipelineConfigRecord?.executionPlan),
    requestedStageCount: count(payload.requested_stages),
    sourceDocumentCount: count(payload.source_document_ids),
    sourceFolderCount: count(payload.source_folder_ids),
  }
}

function createAsyncCallbackPayload(
  batch: ProcessBatchStatus,
  initiatedAt: string,
  requestId: string,
  callbackUrl: string,
  executionContext: PipelineExecutionContextInput = {},
  sourceFolderIds: readonly string[] = [],
  includeBatchName = false,
): Record<string, unknown> {
  if (!batch.startedBy) {
    throw new Error(`Batch ${batch.batchId} is missing startedBy.`)
  }

  const context = normalizePipelineExecutionContext(requestId, executionContext, {
    targetBatchId: batch.batchId || undefined,
  })

  return {
    app: 'preserv-dashboard',
    request_id: requestId,
    batch_id: batch.batchId || null,
    started_by: batch.startedBy,
    initiated_at: initiatedAt,
    execution_mode: context.executionMode,
    operation_id: context.operationId,
    idempotency_key: context.idempotencyKey,
    reason: context.reason ?? null,
    source_document_ids: context.sourceDocumentIds ?? [],
    source_batch_id: context.sourceBatchId ?? null,
    new_batch_name: context.newBatchName ?? null,
    draft_batch_id: context.draftBatchId ?? null,
    requested_stages: context.requestedStages ?? [],
    collection: context.collection ?? null,
    pipeline_config: context.pipelineConfig ?? null,
    ...(sourceFolderIds.length > 0 ? { source_folder_ids: [...sourceFolderIds] } : {}),
    callback: {
      url: callbackUrl,
      token: readRequiredEnv('PIPELINE_CALLBACK_TOKEN', 'PIPELINE_CALLBACK_TOKEN is not configured.'),
    },
    ...(includeBatchName ? { batch_name: batch.batchName || batch.batchId } : {}),
  }
}

function createReprocessCallbackPayload(
  batch: ProcessBatchStatus,
  initiatedAt: string,
  requestId: string,
  config: ReprocessTriggerConfig,
  executionContext: PipelineExecutionContextInput,
): Record<string, unknown> {
  if (!batch.startedBy || !batch.batchId) {
    throw new Error('A reprocessing batch is missing its batch ID or startedBy.')
  }
  const context = normalizePipelineExecutionContext(requestId, executionContext, {
    targetBatchId: batch.batchId,
  })
  if (context.executionMode !== 'reprocess') {
    throw new Error('Data Ingester reprocessing requires reprocess execution.')
  }
  if (!context.sourceDocumentIds?.length) {
    throw new Error('Data Ingester reprocessing requires source documents.')
  }
  if (!context.requestedStages?.length) {
    throw new Error('Data Ingester reprocessing requires requested stages.')
  }

  return {
    app: 'preserv-dashboard',
    request_id: requestId,
    batch_id: batch.batchId,
    batch_name: batch.batchName || batch.batchId,
    started_by: batch.startedBy,
    initiated_at: initiatedAt,
    execution_mode: context.executionMode,
    operation_id: context.operationId,
    idempotency_key: context.idempotencyKey,
    reason: context.reason ?? null,
    source_document_ids: context.sourceDocumentIds,
    source_batch_id: context.sourceBatchId ?? null,
    draft_batch_id: context.draftBatchId ?? null,
    requested_stages: context.requestedStages,
    collection: context.collection ?? null,
    pipeline_config: context.pipelineConfig ?? null,
    callback: {
      url: buildStageCallbackUrl(config.callbackPath),
      token: readRequiredEnv('PIPELINE_CALLBACK_TOKEN', 'PIPELINE_CALLBACK_TOKEN is not configured.'),
    },
  }
}

async function triggerPipelineService(
  batch: ProcessBatchStatus,
  config: TriggerConfig,
  executionContext: PipelineExecutionContextInput = {},
): Promise<PipelineTriggerAcceptedResponse> {
  const baseUrl = readRequiredEnv('PIPELINE_API_BASE_URL', 'PIPELINE_API_BASE_URL is not configured.')
  const triggerToken = readRequiredEnv('PIPELINE_TRIGGER_TOKEN', 'PIPELINE_TRIGGER_TOKEN is not configured.')
  const requestId = randomUUID()
  const initiatedAt = new Date().toISOString()
  const callbackUrl = buildStageCallbackUrl(config.callbackPath)
  const payload = createAsyncCallbackPayload(
    batch,
    initiatedAt,
    requestId,
    callbackUrl,
    executionContext,
    config.includeSourceFolderIds ? executionContext.pipelineConfig?.sourceFolderIds ?? [] : [],
    config.includeBatchName,
  )

  logEvent('info', `${config.serviceName}_trigger_requested`, {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    startedBy: batch.startedBy,
    callbackUrl,
    payloadSummary: getPayloadSummary(payload),
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
      responseDetails: getResponseDetails(responseBody),
      payloadSummary: getPayloadSummary(payload),
    })
    throw new Error(errorMessage)
  }

  logEvent('info', `${config.serviceName}_trigger_accepted`, {
    batchId: batch.batchId,
    batchName: batch.batchName,
    requestId,
    statusCode: response.status,
  })

  const acceptedBody = typeof responseBody === 'object' && responseBody !== null ? responseBody : {}
  return {
    batchId: 'batchId' in acceptedBody && typeof acceptedBody.batchId === 'string' ? acceptedBody.batchId : null,
    status: 'status' in acceptedBody && typeof acceptedBody.status === 'string' ? acceptedBody.status : null,
    service: 'service' in acceptedBody && typeof acceptedBody.service === 'string' ? acceptedBody.service : null,
  }
}

export async function triggerDocumentSplitter(
  batch: ProcessBatchStatus,
  executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return triggerPipelineService(
    batch,
    {
      serviceName: DOCUMENT_SPLITTER_SERVICE,
      callbackPath: DOCUMENT_SPLITTER_CALLBACK_PATH,
      endpointPath: '/split',
    },
    executionContext,
  )
}

export async function triggerDataIngesterBatch(
  batch: ProcessBatchStatus,
  executionContext: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  const sourceFolderIds = executionContext.pipelineConfig?.sourceFolderIds ?? []
  if (sourceFolderIds.length === 0 && !(executionContext.sourceDocumentIds ?? []).length) {
    throw new Error('Data Ingester draft submission requires a folder or document source.')
  }

  return triggerPipelineService(
    batch,
    {
      serviceName: DATA_INGESTER_SERVICE,
      callbackPath: DATA_INGESTER_CALLBACK_PATH,
      endpointPath: '/ingest',
      includeSourceFolderIds: true,
      includeBatchName: true,
    },
    executionContext,
  )
}

export async function triggerPageRotator(
  batch: ProcessBatchStatus,
  executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return triggerPipelineService(
    batch,
    {
      serviceName: PAGE_ROTATOR_SERVICE,
      callbackPath: PAGE_ROTATOR_CALLBACK_PATH,
      endpointPath: '/rotate',
    },
    executionContext,
  )
}

export async function triggerOcrProcessor(
  batch: ProcessBatchStatus,
  executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return triggerPipelineService(
    batch,
    {
      serviceName: OCR_PROCESSOR_SERVICE,
      callbackPath: OCR_PROCESSOR_CALLBACK_PATH,
      endpointPath: '/ocr',
    },
    executionContext,
  )
}

export async function triggerContentDedup(
  batch: ProcessBatchStatus,
  executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return triggerPipelineService(
    batch,
    {
      serviceName: CONTENT_DEDUP_SERVICE,
      callbackPath: CONTENT_DEDUP_CALLBACK_PATH,
      endpointPath: '/content-dedup',
    },
    executionContext,
  )
}

export async function triggerMetadataExtractor(
  batch: ProcessBatchStatus,
  executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return triggerPipelineService(
    batch,
    {
      serviceName: METADATA_EXTRACTOR_SERVICE,
      callbackPath: METADATA_EXTRACTOR_CALLBACK_PATH,
      endpointPath: '/metadata-extractor',
    },
    executionContext,
  )
}

export async function triggerFedoraIngester(
  batch: ProcessBatchStatus,
  executionContext?: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  return triggerPipelineService(
    batch,
    {
      serviceName: FEDORA_INGESTER_SERVICE,
      callbackPath: FEDORA_INGESTER_CALLBACK_PATH,
      endpointPath: '/fedora-ingester',
    },
    executionContext,
  )
}

export async function triggerDataIngesterReprocess(
  batch: ProcessBatchStatus,
  executionContext: PipelineExecutionContextInput,
): Promise<PipelineTriggerAcceptedResponse> {
  const baseUrl = readRequiredEnv('PIPELINE_API_BASE_URL', 'PIPELINE_API_BASE_URL is not configured.')
  const triggerToken = readRequiredEnv('PIPELINE_TRIGGER_TOKEN', 'PIPELINE_TRIGGER_TOKEN is not configured.')
  const requestId = randomUUID()
  const initiatedAt = new Date().toISOString()
  const config: ReprocessTriggerConfig = {
    endpointPath: '/reprocess',
    callbackPath: DATA_INGESTER_REPROCESS_CALLBACK_PATH,
  }
  const payload = createReprocessCallbackPayload(batch, initiatedAt, requestId, config, executionContext)
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
    throw new Error(getErrorMessage(responseBody, `data-ingester reprocess returned ${response.status}`))
  }
  const acceptedBody = typeof responseBody === 'object' && responseBody !== null ? responseBody : {}
  return {
    batchId: 'batchId' in acceptedBody && typeof acceptedBody.batchId === 'string' ? acceptedBody.batchId : null,
    status: 'status' in acceptedBody && typeof acceptedBody.status === 'string' ? acceptedBody.status : null,
    service: 'service' in acceptedBody && typeof acceptedBody.service === 'string' ? acceptedBody.service : null,
  }
}
