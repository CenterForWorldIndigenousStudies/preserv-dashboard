import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import { parseBearerToken, parsePipelineCallbackBody } from '@lib/pipelineCallbacks'
import {
  finalizePipelineReadinessIfDue,
  shouldTriggerMetadataValidator,
  triggerMetadataValidator,
} from '@lib/pipelineTriggers'
import {
  getProcessBatchStatus,
  markProcessStageCallbackReceived,
  recordMetadataExtractorCompletion,
} from '@lib/processBatches'
import type { PipelineCallbackBody } from 'types/pipelineContracts'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface MetadataExtractorCallbackBody extends PipelineCallbackBody {
  processed_count?: unknown
  extracted_count?: unknown
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
    logEvent('warn', 'metadata_extractor_callback_unauthorized')
    return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
  }

  let body: MetadataExtractorCallbackBody
  try {
    body = (await request.json()) as MetadataExtractorCallbackBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { batchId, requestId, status, errorMessage } = parsePipelineCallbackBody(body)
  if (!batchId) {
    return NextResponse.json({ error: 'batch_id is required.' }, { status: 400 })
  }

  try {
    const currentBatch = await getProcessBatchStatus(batchId)
    if (!currentBatch) {
      throw new Error(`Batch ${batchId} was not found before recording metadata-extractor callback.`)
    }
    const isOpenAIBatchMode =
      currentBatch.metadataExtractor?.mode === 'openai_batch' ||
      currentBatch.pipelineConfig?.metadataExtraction.mode === 'openai_batch'

    const completedAt = new Date().toISOString()
    const receivedAt = Math.floor(Date.now() / 1000)
    if (!isOpenAIBatchMode) {
      await recordMetadataExtractorCompletion(batchId, {
        requestId,
        initiatedAt: completedAt,
        completedAt,
        processedCount: parseCount(body.processed_count),
        extractedCount: parseCount(body.extracted_count),
        failedCount: parseCount(body.failed_count),
      })
    }
    await markProcessStageCallbackReceived(batchId, 'metadata_extractor', receivedAt)
    logEvent('info', 'metadata_extractor_callback_received', {
      batchId,
      requestId,
      status,
      errorMessage: errorMessage || null,
    })

    const batch = await getProcessBatchStatus(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} was not found after recording metadata-extractor callback.`)
    }

    if (shouldTriggerMetadataValidator(batch)) {
      await triggerMetadataValidator(batch)
    }
    await finalizePipelineReadinessIfDue(batch)

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record metadata-extractor callback.'
    logEvent('error', 'metadata_extractor_callback_record_failed', {
      batchId,
      requestId,
      status,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
