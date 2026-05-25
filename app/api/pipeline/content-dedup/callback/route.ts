import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import { markProcessStageCallbackReceived } from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface ContentDedupCallbackBody {
  batch_id?: unknown
  request_id?: unknown
  status?: unknown
  error?: unknown
}

function parseBearerToken(authorization: string | null): string {
  return (authorization ?? '').replace(/^Bearer\s+/i, '').trim()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.CONTENT_DEDUP_CALLBACK_TOKEN?.trim()
  if (!expectedToken) {
    return NextResponse.json({ error: 'CONTENT_DEDUP_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  const actualToken = parseBearerToken(request.headers.get('authorization'))
  if (actualToken !== expectedToken) {
    logEvent('warn', 'content_dedup_callback_unauthorized')
    return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
  }

  let body: ContentDedupCallbackBody
  try {
    body = (await request.json()) as ContentDedupCallbackBody
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
    await markProcessStageCallbackReceived(batchId, 'content_dedup', new Date().toISOString())
    logEvent('info', 'content_dedup_callback_received', {
      batchId,
      requestId,
      status,
      errorMessage: errorMessage || null,
    })
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record content-dedup callback.'
    logEvent('error', 'content_dedup_callback_record_failed', {
      batchId,
      requestId,
      status,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
