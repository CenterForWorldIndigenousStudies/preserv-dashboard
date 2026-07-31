import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import {
  METADATA_EXTRACTOR_CALLBACK_PATH,
  METADATA_EXTRACTOR_OPENAI_BATCH_STATUS_PATH,
} from '@constants/paths'
import { DASHBOARD_BASE_URL } from '@constants/server'
import { logEvent } from '@lib/observability'
import { getProcessBatchStatus } from '@lib/processBatches'
import { getDashboardSession } from '@root/auth'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface RouteRequestBody {
  batchId?: unknown
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function requireTriggerConfig(): { pipelineBaseUrl: string; triggerToken: string; callbackToken: string } {
  const pipelineBaseUrl = process.env.PIPELINE_API_BASE_URL?.trim()
  const triggerToken = process.env.PIPELINE_TRIGGER_TOKEN?.trim()
  const callbackToken = process.env.PIPELINE_CALLBACK_TOKEN?.trim()
  if (!pipelineBaseUrl) {
    throw new Error('PIPELINE_API_BASE_URL is not configured.')
  }
  if (!triggerToken) {
    throw new Error('PIPELINE_TRIGGER_TOKEN is not configured.')
  }
  if (!callbackToken) {
    throw new Error('PIPELINE_CALLBACK_TOKEN is not configured.')
  }
  return { pipelineBaseUrl, triggerToken, callbackToken }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getDashboardSession()
  const startedBy = session?.user?.email?.trim()
  if (!startedBy) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  let body: RouteRequestBody
  try {
    body = (await request.json()) as RouteRequestBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const batchId = normalizeText(body.batchId)
  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required.' }, { status: 400 })
  }

  const batch = await getProcessBatchStatus(batchId)
  if (!batch) {
    return NextResponse.json({ error: `Batch ${batchId} was not found.` }, { status: 404 })
  }
  if (batch.pipelineConfig?.metadataExtraction.mode !== 'openai_batch') {
    return NextResponse.json(
      { error: `Batch ${batchId} is not configured for OpenAI Batch metadata extraction.` },
      { status: 400 },
    )
  }
  if (!batch.metadataExtractor?.openaiBatchWave1?.openaiBatchId) {
    return NextResponse.json(
      { error: `Wave one must be submitted before OpenAI batch status can be checked for batch ${batchId}.` },
      { status: 400 },
    )
  }

  let triggerConfig: { pipelineBaseUrl: string; triggerToken: string; callbackToken: string }
  try {
    triggerConfig = requireTriggerConfig()
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Trigger configuration is invalid.' },
      { status: 500 },
    )
  }

  const requestId = randomUUID()
  const initiatedAt = new Date().toISOString()
  const callbackUrl = new URL(METADATA_EXTRACTOR_CALLBACK_PATH, DASHBOARD_BASE_URL).toString()

  try {
    const response = await fetch(new URL('/metadata-extractor/openai-batch-status', triggerConfig.pipelineBaseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${triggerConfig.triggerToken}`,
      },
      body: JSON.stringify({
        app: 'preserv-dashboard',
        request_id: requestId,
        batch_id: batchId,
        started_by: startedBy,
        initiated_at: initiatedAt,
        callback: {
          url: callbackUrl,
          token: triggerConfig.callbackToken,
        },
      }),
      cache: 'no-store',
    })
    const payload = (await response.json()) as Record<string, unknown>
    if (!response.ok) {
      const errorMessage =
        typeof payload.error === 'string'
          ? payload.error
          : typeof payload.detail === 'string'
            ? payload.detail
            : 'Failed to queue OpenAI batch status check.'
      throw new Error(errorMessage)
    }

    logEvent('info', 'metadata_extractor_openai_batch_status_requested', {
      batchId,
      requestId,
      startedBy,
      route: METADATA_EXTRACTOR_OPENAI_BATCH_STATUS_PATH,
    })
    return NextResponse.json(payload, { status: response.status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to queue OpenAI batch status check.'
    logEvent('error', 'metadata_extractor_openai_batch_status_failed', {
      batchId,
      requestId,
      startedBy,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
