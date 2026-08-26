import { NextRequest, NextResponse } from 'next/server'

import {
  getPipelineContinuationContext,
  shouldTriggerContentDedup,
  finalizePipelineReadinessIfDue,
  shouldTriggerMetadataExtractor,
  triggerContentDedup,
  triggerMetadataExtractor,
} from '@lib/pipelineTriggers'
import { handlePipelineCallback } from '@lib/pipelineCallbackHandling'
import { getProcessBatchStatus, markProcessStageCallbackReceived } from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePipelineCallback({
    request,
    stage: 'ocr_processor',
    eventName: 'ocr_processor_callback',
    onSuccess: async ({ parsed }) => {
      await markProcessStageCallbackReceived(parsed.batchId, 'ocr_processor', Math.floor(Date.now() / 1000))
      const batch = await getProcessBatchStatus(parsed.batchId)
    if (!batch) {
        throw new Error(`Batch ${parsed.batchId} was not found after recording ocr-processor callback.`)
    }

    if (shouldTriggerContentDedup(batch)) {
      await triggerContentDedup(batch, getPipelineContinuationContext(batch))
    } else if (shouldTriggerMetadataExtractor(batch)) {
      await triggerMetadataExtractor(batch, getPipelineContinuationContext(batch))
    }
    await finalizePipelineReadinessIfDue(batch)
    },
  })
}
