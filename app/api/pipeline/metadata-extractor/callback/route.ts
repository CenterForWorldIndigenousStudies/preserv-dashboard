import { NextRequest, NextResponse } from 'next/server'

import {
  getPipelineContinuationContext,
  finalizePipelineReadinessIfDue,
  shouldTriggerMetadataValidator,
  triggerMetadataValidator,
} from '@lib/pipelineTriggers'
import { handlePipelineCallback } from '@lib/pipelineCallbackHandling'
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
  return handlePipelineCallback({
    request,
    stage: 'metadata_extractor',
    eventName: 'metadata_extractor_callback',
    onSuccess: async ({ body, parsed, batch: currentBatch }) => {
      const callbackBody = body as MetadataExtractorCallbackBody
      const isOpenAIBatchMode =
        currentBatch.metadataExtractor?.mode === 'openai_batch' ||
        currentBatch.pipelineConfig?.metadataExtraction.mode === 'openai_batch'

      const completedAt = new Date().toISOString()
      const receivedAt = Math.floor(Date.now() / 1000)
      if (!isOpenAIBatchMode) {
        await recordMetadataExtractorCompletion(parsed.batchId, {
          requestId: parsed.requestId,
          initiatedAt: completedAt,
          completedAt,
          processedCount: parseCount(callbackBody.processed_count),
          extractedCount: parseCount(callbackBody.extracted_count),
          failedCount: parseCount(callbackBody.failed_count),
        })
      }
      await markProcessStageCallbackReceived(parsed.batchId, 'metadata_extractor', receivedAt)

      const batch = await getProcessBatchStatus(parsed.batchId)
      if (!batch) {
        throw new Error(`Batch ${parsed.batchId} was not found after recording metadata-extractor callback.`)
      }

      if (shouldTriggerMetadataValidator(batch)) {
        await triggerMetadataValidator(batch, getPipelineContinuationContext(batch))
      }
      await finalizePipelineReadinessIfDue(batch)
    },
  })
}
