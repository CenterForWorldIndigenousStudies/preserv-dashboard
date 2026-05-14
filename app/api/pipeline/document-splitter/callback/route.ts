import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import {
  shouldTriggerContentDedup,
  shouldTriggerOcrProcessor,
  shouldTriggerPageRotator,
  triggerContentDedup,
  triggerOcrProcessor,
  triggerPageRotator,
} from '@lib/pipelineTriggers'
import {
  getProcessBatchStatus,
  markProcessStageCallbackReceived,
} from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface DocumentSplitterCallbackBody {
  batch_id?: unknown
  request_id?: unknown
  status?: unknown
  error?: unknown
}

function parseBearerToken(authorization: string | null): string {
  return (authorization ?? '').replace(/^Bearer\s+/i, '').trim()
}

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

  let body: DocumentSplitterCallbackBody
  try {
    body = (await request.json()) as DocumentSplitterCallbackBody
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
    await markProcessStageCallbackReceived(batchId, 'document_splitter', new Date().toISOString())
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
