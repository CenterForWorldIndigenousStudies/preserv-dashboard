import { NextRequest, NextResponse } from 'next/server'

import { handlePipelineCallback } from '@lib/pipelineCallbackHandling'
import { markProcessStageCallbackReceived } from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePipelineCallback({
    request,
    stage: 'fedora_ingester',
    eventName: 'fedora_ingester_callback',
    onSuccess: async ({ parsed }) => {
      await markProcessStageCallbackReceived(parsed.batchId, 'fedora_ingester', Math.floor(Date.now() / 1000))
    },
  })
}
