import { NextRequest, NextResponse } from 'next/server'

import {
  getPipelineContinuationContext,
  finalizePipelineReadinessIfDue,
  shouldTriggerMetadataExtractor,
  triggerMetadataExtractor,
} from '@lib/pipelineTriggers'
import { handlePipelineCallback } from '@lib/pipelineCallbackHandling'
import { getProcessBatchStatus, markProcessStageCallbackReceived } from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePipelineCallback({
    request,
    stage: 'content_dedup',
    eventName: 'content_dedup_callback',
    onSuccess: async ({ parsed }) => {
      await markProcessStageCallbackReceived(parsed.batchId, 'content_dedup', Math.floor(Date.now() / 1000))
      const batch = await getProcessBatchStatus(parsed.batchId)
    if (!batch) {
        throw new Error(`Batch ${parsed.batchId} was not found after recording content-dedup callback.`)
    }

    if (shouldTriggerMetadataExtractor(batch)) {
      await triggerMetadataExtractor(batch, getPipelineContinuationContext(batch))
    }
    await finalizePipelineReadinessIfDue(batch)
    },
  })
}
