import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import { parseBearerToken, parsePipelineCallbackBody } from '@lib/pipelineCallbacks'
import {
  shouldTriggerContentDedup,
  shouldTriggerOcrProcessor,
  shouldTriggerPageRotator,
  triggerContentDedup,
  triggerOcrProcessor,
  triggerPageRotator,
} from '@lib/pipelineTriggers'
import { getProcessBatchStatus, markProcessStageCallbackReceived } from '@lib/processBatches'
import type { PipelineCallbackBody } from 'types/pipelineContracts'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.DOCUMENT_SPLITTER_CALLBACK_TOKEN?.trim()
  if (!expectedToken) {
    return NextResponse.json({ error: 'DOCUMENT_SPLITTER_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  const actualToken = parseBearerToken(request.headers.get('authorization'))
  if (actualToken !== expectedToken) {
    logEvent('warn', 'document_splitter_callback_unauthorized')
    return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
  }

  let body: PipelineCallbackBody
  try {
    body = (await request.json()) as PipelineCallbackBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { batchId, requestId, status, errorMessage } = parsePipelineCallbackBody(body)
  if (!batchId) {
    return NextResponse.json({ error: 'batch_id is required.' }, { status: 400 })
  }

  try {
    await markProcessStageCallbackReceived(batchId, 'document_splitter', Math.floor(Date.now() / 1000))
    logEvent('info', 'document_splitter_callback_received', {
      batchId,
      requestId,
      status,
      errorMessage: errorMessage || null,
    })

    const batch = await getProcessBatchStatus(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} was not found after recording document-splitter callback.`)
    }

    if (shouldTriggerPageRotator(batch)) {
      await triggerPageRotator(batch)
    } else if (shouldTriggerOcrProcessor(batch)) {
      await triggerOcrProcessor(batch)
    } else if (shouldTriggerContentDedup(batch)) {
      await triggerContentDedup(batch)
    }
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record document-splitter callback.'
    logEvent('error', 'document_splitter_callback_record_failed', {
      batchId,
      requestId,
      status,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
