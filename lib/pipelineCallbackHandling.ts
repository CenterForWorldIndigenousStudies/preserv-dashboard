import { NextRequest, NextResponse } from 'next/server'

import { PIPELINE_EXECUTION_MODES } from '@constants/pipelineExecutionModes'
import { logEvent } from '@lib/observability'
import {
  parseBearerToken,
  parsePipelineCallbackBody,
  type ParsedPipelineCallbackBody,
} from '@lib/pipelineCallbacks'
import {
  getProcessBatchStatus,
  recordProcessStageFailure,
} from '@lib/processBatches'
import type {
  CallbackStageKey,
  PipelineCallbackBody,
  ProcessBatchStatus,
} from 'types/pipelineContracts'

interface PipelineCallbackHandlerArgs {
  request: NextRequest
  stage: CallbackStageKey
  eventName: string
  onSuccess: (args: {
    body: PipelineCallbackBody
    parsed: ParsedPipelineCallbackBody
    batch: ProcessBatchStatus
  }) => Promise<void>
}

function getStageDetails(
  batch: ProcessBatchStatus,
  stage: CallbackStageKey,
): ProcessBatchStatus['ingester'] {
  const stageDetails: Record<CallbackStageKey, ProcessBatchStatus['ingester']> = {
    ingester: batch.ingester,
    document_splitter: batch.documentSplitter,
    page_rotator: batch.pageRotator,
    ocr_processor: batch.ocrProcessor,
    content_dedup: batch.contentDedup,
    metadata_extractor: batch.metadataExtractor,
    metadata_validator: batch.metadataValidator,
    rights_determinator: batch.rightsDeterminator,
    fedora_ingester: batch.fedoraIngester ?? null,
  }

  return stageDetails[stage]
}

function isStaleCallback(
  batch: ProcessBatchStatus,
  stage: CallbackStageKey,
  parsed: ParsedPipelineCallbackBody,
): boolean {
  const currentOperationId = getStageDetails(batch, stage)?.operationId
  return Boolean(parsed.operationId && currentOperationId && parsed.operationId !== currentOperationId)
}

function unauthorizedCallbackResponse(eventName: string): NextResponse {
  logEvent('warn', `${eventName}_unauthorized`)
  return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
}

async function parseCallbackRequest(
  request: NextRequest,
): Promise<{ body: PipelineCallbackBody; parsed: ParsedPipelineCallbackBody } | NextResponse> {
  let body: PipelineCallbackBody
  try {
    body = (await request.json()) as PipelineCallbackBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = parsePipelineCallbackBody(body)
  if (!parsed.batchId) {
    return NextResponse.json({ error: 'batch_id is required.' }, { status: 400 })
  }

  return { body, parsed }
}

async function processCallback({
  body,
  parsed,
  stage,
  eventName,
  onSuccess,
}: PipelineCallbackHandlerArgs & {
  body: PipelineCallbackBody
  parsed: ParsedPipelineCallbackBody
}): Promise<NextResponse> {
  const batch = await getProcessBatchStatus(parsed.batchId)
  if (!batch) {
    throw new Error(`Batch ${parsed.batchId} was not found before ${stage} callback.`)
  }

  if (isStaleCallback(batch, stage, parsed)) {
    logEvent('warn', `${eventName}_stale`, {
      batchId: parsed.batchId,
      requestId: parsed.requestId,
      operationId: parsed.operationId,
      currentOperationId: getStageDetails(batch, stage)?.operationId ?? null,
    })
    return new NextResponse(null, { status: 204 })
  }

  if (parsed.status === 'failed') {
    await recordProcessStageFailure(parsed.batchId, stage, {
      requestId: parsed.requestId,
      operationId: parsed.operationId || parsed.requestId,
      executionMode: parsed.executionMode || PIPELINE_EXECUTION_MODES.NORMAL,
      errorType: 'PipelineStageFailure',
      errorMessage: parsed.errorMessage || `${stage} reported failure.`,
      receivedAt: Math.floor(Date.now() / 1000),
    })
    logEvent('error', `${eventName}_failed`, {
      batchId: parsed.batchId,
      requestId: parsed.requestId,
      operationId: parsed.operationId || null,
      errorMessage: parsed.errorMessage || null,
    })
    return new NextResponse(null, { status: 204 })
  }

  await onSuccess({ body, parsed, batch })
  logEvent('info', `${eventName}_received`, {
    batchId: parsed.batchId,
    requestId: parsed.requestId,
    operationId: parsed.operationId || null,
    status: parsed.status,
    errorMessage: parsed.errorMessage || null,
  })
  return new NextResponse(null, { status: 204 })
}

export async function handlePipelineCallback({
  request,
  stage,
  eventName,
  onSuccess,
}: PipelineCallbackHandlerArgs): Promise<NextResponse> {
  const expectedToken = process.env.PIPELINE_CALLBACK_TOKEN?.trim()
  if (!expectedToken) {
    return NextResponse.json({ error: 'PIPELINE_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  if (parseBearerToken(request.headers.get('authorization')) !== expectedToken) {
    return unauthorizedCallbackResponse(eventName)
  }

  const parsedRequest = await parseCallbackRequest(request)
  if (parsedRequest instanceof NextResponse) {
    return parsedRequest
  }

  try {
    return await processCallback({
      body: parsedRequest.body,
      parsed: parsedRequest.parsed,
      stage,
      eventName,
      onSuccess,
      request,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : `Failed to record ${stage} callback.`
    logEvent('error', `${eventName}_record_failed`, {
      batchId: parsedRequest.parsed.batchId,
      requestId: parsedRequest.parsed.requestId,
      operationId: parsedRequest.parsed.operationId || null,
      status: parsedRequest.parsed.status,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
