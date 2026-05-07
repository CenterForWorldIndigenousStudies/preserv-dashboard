import { NextRequest, NextResponse } from 'next/server'

import { markIngestCallbackReceived } from '@lib/ingestBatches'
import { logEvent } from '@lib/observability'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface IngestCallbackBody {
  batch_id?: unknown
  request_id?: unknown
  status?: unknown
  error?: unknown
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.INGESTER_CALLBACK_TOKEN?.trim()
  if (!expectedToken) {
    return NextResponse.json({ error: 'INGESTER_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  const authorization = request.headers.get('authorization') ?? ''
  const actualToken = authorization.replace(/^Bearer\s+/i, '').trim()
  if (actualToken !== expectedToken) {
    logEvent('warn', 'ingest_callback_unauthorized')
    return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
  }

  let body: IngestCallbackBody
  try {
    body = (await request.json()) as IngestCallbackBody
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
    await markIngestCallbackReceived(batchId, new Date().toISOString())
    logEvent('info', 'ingest_callback_received', {
      batchId,
      requestId,
      status,
      errorMessage: errorMessage || null,
    })
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record ingest callback.'
    logEvent('error', 'ingest_callback_record_failed', {
      batchId,
      requestId,
      status,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
