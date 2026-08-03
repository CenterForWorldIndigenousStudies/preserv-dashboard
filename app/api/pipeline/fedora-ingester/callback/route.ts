import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import { parseBearerToken, parsePipelineCallbackBody } from '@lib/pipelineCallbacks'
import { getProcessBatchStatus, markProcessStageCallbackReceived } from '@lib/processBatches'
import type { PipelineCallbackBody } from 'types/pipelineContracts'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.PIPELINE_CALLBACK_TOKEN?.trim()
  if (!expectedToken) {
    return NextResponse.json({ error: 'PIPELINE_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  if (parseBearerToken(request.headers.get('authorization')) !== expectedToken) {
    logEvent('warn', 'fedora_ingester_callback_unauthorized')
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
    const batch = await getProcessBatchStatus(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} was not found after Fedora callback.`)
    }
    await markProcessStageCallbackReceived(batchId, 'fedora_ingester', Math.floor(Date.now() / 1000))
    logEvent('info', 'fedora_ingester_callback_received', {
      batchId,
      requestId,
      status,
      errorMessage: errorMessage || null,
    })
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record Fedora callback.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
