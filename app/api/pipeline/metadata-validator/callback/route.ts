import { NextRequest, NextResponse } from 'next/server'

import {
  getPipelineContinuationContext,
  finalizePipelineReadinessIfDue,
  shouldTriggerRightsDeterminator,
  triggerRightsDeterminator,
} from '@lib/pipelineTriggers'
import { handlePipelineCallback } from '@lib/pipelineCallbackHandling'
import {
  getProcessBatchStatus,
  markProcessStageCallbackReceived,
  recordMetadataValidatorCompletion,
} from '@lib/processBatches'
import type { PipelineCallbackBody } from 'types/pipelineContracts'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

interface MetadataValidatorCallbackBody extends PipelineCallbackBody {
  processed_count?: unknown
  metadata_validated_count?: unknown
  needs_review_count?: unknown
  failed_count?: unknown
}

function parseCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePipelineCallback({
    request,
    stage: 'metadata_validator',
    eventName: 'metadata_validator_callback',
    onSuccess: async ({ body, parsed }) => {
      const callbackBody = body as MetadataValidatorCallbackBody
      const completedAt = new Date().toISOString()
      const receivedAt = Math.floor(Date.now() / 1000)
      await recordMetadataValidatorCompletion(parsed.batchId, {
        requestId: parsed.requestId,
        initiatedAt: completedAt,
        completedAt,
        processedCount: parseCount(callbackBody.processed_count),
        metadataValidatedCount: parseCount(callbackBody.metadata_validated_count),
        needsReviewCount: parseCount(callbackBody.needs_review_count),
        failedCount: parseCount(callbackBody.failed_count),
      })
      await markProcessStageCallbackReceived(parsed.batchId, 'metadata_validator', receivedAt)

      const batch = await getProcessBatchStatus(parsed.batchId)
      if (!batch) {
        throw new Error(`Batch ${parsed.batchId} was not found after recording metadata-validator callback.`)
      }

      if (shouldTriggerRightsDeterminator(batch)) {
        await triggerRightsDeterminator(batch, getPipelineContinuationContext(batch))
      }
      await finalizePipelineReadinessIfDue(batch)

    },
  })
}
