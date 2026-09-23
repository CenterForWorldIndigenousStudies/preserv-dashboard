import { NextRequest, NextResponse } from 'next/server'

import { DATA_INGESTER_SERVICE } from '@constants/pipeline'
import {
  finalizePipelineReadinessIfDue,
  getPipelineContinuationContext,
  shouldTriggerContentDedup,
  shouldTriggerDocumentSplitter,
  shouldTriggerMetadataExtractor,
  shouldTriggerOcrProcessor,
  shouldTriggerPageRotator,
  triggerContentDedup,
  triggerDocumentSplitter,
  triggerMetadataExtractor,
  triggerOcrProcessor,
  triggerPageRotator,
} from '@lib/pipelineTriggers'
import { handlePipelineCallback } from '@lib/pipelineCallbackHandling'
import { getProcessBatchStatus, markProcessStageCallbackReceived } from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePipelineCallback({
    request,
    stage: DATA_INGESTER_SERVICE,
    eventName: 'reprocess_callback',
    expectedExecutionMode: 'reprocess',
    onSuccess: async ({ parsed }) => {
      await markProcessStageCallbackReceived(parsed.batchId, DATA_INGESTER_SERVICE, Math.floor(Date.now() / 1000))
      const batch = await getProcessBatchStatus(parsed.batchId)
      if (!batch) {
        throw new Error(`Batch ${parsed.batchId} was not found after recording reprocess callback.`)
      }

      if (shouldTriggerDocumentSplitter(batch)) {
        await triggerDocumentSplitter(batch, getPipelineContinuationContext(batch))
      } else if (shouldTriggerPageRotator(batch)) {
        await triggerPageRotator(batch, getPipelineContinuationContext(batch))
      } else if (shouldTriggerOcrProcessor(batch)) {
        await triggerOcrProcessor(batch, getPipelineContinuationContext(batch))
      } else if (shouldTriggerContentDedup(batch)) {
        await triggerContentDedup(batch, getPipelineContinuationContext(batch))
      } else if (shouldTriggerMetadataExtractor(batch)) {
        await triggerMetadataExtractor(batch, getPipelineContinuationContext(batch))
      }
      await finalizePipelineReadinessIfDue(batch)
    },
  })
}
