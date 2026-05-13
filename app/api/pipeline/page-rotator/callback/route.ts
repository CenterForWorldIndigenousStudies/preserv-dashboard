import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import { shouldTriggerOcrProcessor, triggerOcrProcessor } from '@lib/pipelineTriggers'
import { getProcessBatchStatus, markProcessStageCallbackReceived } from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface PageRotatorCallbackBody {
  batch_id?: unknown
  request_id?: unknown
  status?: unknown
  error?: unknown
}

function parseBearerToken(authorization: string | null): string {
  return (authorization ?? '').replace(/^Bearer\s+/i, '').trim()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.PAGE_ROTATOR_CALLBACK_TOKEN?.trim()
  if (!expectedToken) {
    return NextResponse.json({ error: 'PAGE_ROTATOR_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  const actualToken = parseBearerToken(request.headers.get('authorization'))
  if (actualToken !== expectedToken) {
    logEvent('warn', 'page_rotator_callback_unauthorized')
    return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
  }

  let body: PageRotatorCallbackBody
  try {
    body = (await request.json()) as PageRotatorCallbackBody
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
    await markProcessStageCallbackReceived(batchId, 'page_rotator', new Date().toISOString())
    logEvent('info', 'page_rotator_callback_received', {
      batchId,
      requestId,
      status,
      errorMessage: errorMessage || null,
    })

    const batch = await getProcessBatchStatus(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} was not found after recording page-rotator callback.`)
    }

    if (shouldTriggerOcrProcessor(batch)) {
      await triggerOcrProcessor(batch)
    }
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record page-rotator callback.'
    logEvent('error', 'page_rotator_callback_record_failed', {
      batchId,
      requestId,
      status,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
