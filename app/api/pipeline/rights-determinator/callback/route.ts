import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import { parseBearerToken, parsePipelineCallbackBody } from '@lib/pipelineCallbacks'
import { shouldTriggerFedoraIngester, triggerFedoraIngester } from '@lib/pipelineTriggers'
import {
  getProcessBatchStatus,
  markProcessStageCallbackReceived,
  recordRightsDeterminatorCompletion,
} from '@lib/processBatches'
import type { PipelineCallbackBody } from 'types/pipelineContracts'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface RightsDeterminatorCallbackBody extends PipelineCallbackBody {
  processed_count?: unknown
  rights_determined_count?: unknown
  under_review_count?: unknown
  failed_count?: unknown
}

function parseCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.PIPELINE_CALLBACK_TOKEN?.trim()
  if (!expectedToken) {
    return NextResponse.json({ error: 'PIPELINE_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  const actualToken = parseBearerToken(request.headers.get('authorization'))
  if (actualToken !== expectedToken) {
    logEvent('warn', 'rights_determinator_callback_unauthorized')
    return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
  }

  let body: RightsDeterminatorCallbackBody
  try {
    body = (await request.json()) as RightsDeterminatorCallbackBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { batchId, requestId, status, errorMessage } = parsePipelineCallbackBody(body)
  if (!batchId) {
    return NextResponse.json({ error: 'batch_id is required.' }, { status: 400 })
  }

  try {
    const completedAt = new Date().toISOString()
    const receivedAt = Math.floor(Date.now() / 1000)
    await recordRightsDeterminatorCompletion(batchId, {
      requestId,
      initiatedAt: completedAt,
      completedAt,
      processedCount: parseCount(body.processed_count),
      rightsDeterminedCount: parseCount(body.rights_determined_count),
      underReviewCount: parseCount(body.under_review_count),
      failedCount: parseCount(body.failed_count),
    })
    await markProcessStageCallbackReceived(batchId, 'rights_determinator', receivedAt)
    logEvent('info', 'rights_determinator_callback_received', {
      batchId,
      requestId,
      status,
      errorMessage: errorMessage || null,
    })
    const batch = await getProcessBatchStatus(batchId)
    if (batch && shouldTriggerFedoraIngester(batch)) {
      await triggerFedoraIngester(batch)
    }
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record rights-determinator callback.'
    logEvent('error', 'rights_determinator_callback_record_failed', {
      batchId,
      requestId,
      status,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
