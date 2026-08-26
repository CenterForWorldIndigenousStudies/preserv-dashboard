import { NextRequest, NextResponse } from 'next/server'

import { finalizePipelineReadinessIfDue } from '@lib/pipelineTriggers'
import { handlePipelineCallback } from '@lib/pipelineCallbackHandling'
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
  needs_review_count?: unknown
  failed_count?: unknown
}

function parseCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePipelineCallback({
    request,
    stage: 'rights_determinator',
    eventName: 'rights_determinator_callback',
    onSuccess: async ({ body, parsed }) => {
      const callbackBody = body as RightsDeterminatorCallbackBody
      const completedAt = new Date().toISOString()
      const receivedAt = Math.floor(Date.now() / 1000)
      await recordRightsDeterminatorCompletion(parsed.batchId, {
        requestId: parsed.requestId,
        initiatedAt: completedAt,
        completedAt,
        processedCount: parseCount(callbackBody.processed_count),
        rightsDeterminedCount: parseCount(callbackBody.rights_determined_count),
        needsReviewCount: parseCount(callbackBody.needs_review_count),
        failedCount: parseCount(callbackBody.failed_count),
      })
      await markProcessStageCallbackReceived(parsed.batchId, 'rights_determinator', receivedAt)
      const batch = await getProcessBatchStatus(parsed.batchId)
      await finalizePipelineReadinessIfDue(batch)
    },
  })
}
