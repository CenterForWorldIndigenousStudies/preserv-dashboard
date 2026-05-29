import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import {
  shouldTriggerContentDedup,
  shouldTriggerDocumentSplitter,
  shouldTriggerOcrProcessor,
  shouldTriggerPageRotator,
  triggerContentDedup,
  triggerDocumentSplitter,
  triggerOcrProcessor,
  triggerPageRotator,
} from '@lib/pipelineTriggers'
import { getProcessBatchStatus, markProcessStageCallbackReceived } from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface IngesterCallbackBody {
  batch_id?: unknown
  request_id?: unknown
  status?: unknown
  error?: unknown
}

function parseBearerToken(authorization: string | null): string {
  return (authorization ?? '').replace(/^Bearer\s+/i, '').trim()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.DATA_INGESTER_CALLBACK_TOKEN?.trim()
  if (!expectedToken) {
    return NextResponse.json({ error: 'DATA_INGESTER_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  const actualToken = parseBearerToken(request.headers.get('authorization'))
  if (actualToken !== expectedToken) {
    logEvent('warn', 'ingester_callback_unauthorized')
    return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
  }

  let body: IngesterCallbackBody
  try {
    body = (await request.json()) as IngesterCallbackBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const batchId = typeof body.batch_id === 'string' ? body.batch_id.trim() : ''
  const requestId = typeof body.request_id === 'string' ? body.request_id.trim() : ''
  const status = typeof body.status === 'string' ? body.status.trim() : ''
  const errorMessage = typeof body.error === 'string' ? body.error.trim() : ''
  if (!batchId) {
    return NextResponse.json({ error: 'batch_id is required.' }, { status: 400 })
  }

  try {
    const receivedAtUnix = Math.floor(Date.now() / 1000)
    await markProcessStageCallbackReceived(batchId, 'ingester', receivedAtUnix)
    logEvent('info', 'ingester_callback_received', {
      batchId,
      requestId,
      status,
      errorMessage: errorMessage || null,
    })

    const batch = await getProcessBatchStatus(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} was not found after recording ingester callback.`)
    }

    if (shouldTriggerDocumentSplitter(batch)) {
      await triggerDocumentSplitter(batch)
    } else if (shouldTriggerPageRotator(batch)) {
      await triggerPageRotator(batch)
    } else if (shouldTriggerOcrProcessor(batch)) {
      await triggerOcrProcessor(batch)
    } else if (shouldTriggerContentDedup(batch)) {
      await triggerContentDedup(batch)
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record ingester callback.'
    logEvent('error', 'ingester_callback_record_failed', {
      batchId,
      requestId,
      status,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
